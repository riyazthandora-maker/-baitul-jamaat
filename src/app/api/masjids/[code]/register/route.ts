import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { memberRegistrationSchema } from "@/lib/validators/member";
import { detectDuplicates, validateNameAndAddress } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const masjidCode = code.toUpperCase();

  try {
    const formData = await request.formData();

    // Parse text fields
    const raw = {
      full_name: formData.get("full_name") as string,
      phone: formData.get("phone") as string,
      email: (formData.get("email") as string) || undefined,
      dob: (formData.get("dob") as string) || "",
      gender: (formData.get("gender") as string) || null,
      address: (formData.get("address") as string) || "",
      qualification: (formData.get("qualification") as string) || "",
      job: (formData.get("job") as string) || null,
    };

    const parsed = memberRegistrationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // AI validation — name and address must look like real data
    const nameAddressCheck = await validateNameAndAddress(
      parsed.data.full_name,
      parsed.data.address
    );
    if (!nameAddressCheck.valid) {
      return NextResponse.json(
        { error: nameAddressCheck.reason ?? "Please enter a valid name and address." },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Service-role client for photo upload (bypasses storage RLS)
    const storageClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up masjid
    const { data: masjid, error: masjidErr } = await supabase
      .from("masjids")
      .select("id, masjid_code, name, contact_email")
      .eq("masjid_code", masjidCode)
      .maybeSingle();

    if (masjidErr || !masjid) {
      return NextResponse.json({ error: "Masjid not found" }, { status: 404 });
    }

    const memberId = crypto.randomUUID();
    const folder = `${masjid.id}/${memberId}`;

    // Upload photo only (no identity documents stored)
    await storageClient.storage.createBucket("member-documents", { public: false }).catch(() => {});

    async function uploadFile(file: File, path: string): Promise<string | null> {
      const bytes = await file.arrayBuffer();
      const { error } = await storageClient.storage
        .from("member-documents")
        .upload(path, bytes, { contentType: file.type, upsert: true });
      if (error) {
        console.error("[Register] upload error:", path, error.message);
        return null;
      }
      return path;
    }

    function ext(file: File) {
      return file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    }

    const photoFile = formData.get("photo") as File | null;
    let photo_url: string | null = null;
    if (photoFile && photoFile.size > 0) {
      photo_url = await uploadFile(photoFile, `${folder}/photo.${ext(photoFile)}`);
    }

    // Duplicate detection — fetch existing members of this masjid
    const { data: existingMembers } = await supabase
      .from("members")
      .select("phone, full_name, dob, address, member_number")
      .eq("masjid_id", masjid.id)
      .in("status", ["active", "pending"]);

    const dupResult = await detectDuplicates(
      {
        phone: parsed.data.phone,
        full_name: parsed.data.full_name,
        dob: parsed.data.dob ?? null,
        address: parsed.data.address ?? null,
      },
      (existingMembers ?? []).map((m) => ({
        phone: m.phone,
        full_name: m.full_name,
        dob: m.dob,
        address: m.address,
        member_number: m.member_number,
      }))
    );

    if (dupResult.classification === "duplicate") {
      return NextResponse.json(
        {
          error:
            dupResult.reason ??
            "This phone number is already registered with this masjid.",
        },
        { status: 409 }
      );
    }

    // Insert member row — no identity document URLs stored
    const memberInsert = {
      id: memberId,
      masjid_id: masjid.id,
      status: "pending",
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      address: parsed.data.address || null,
      qualification: parsed.data.qualification || null,
      job: parsed.data.job || null,
      photo_url,
      id_doc_url: null,
      id_doc_back_url: null,
      duplicate_flag: dupResult.classification,
      duplicate_reason: dupResult.reason,
    };

    let { error: insertErr } = await supabase.from("members").insert(memberInsert);

    if (insertErr?.message.includes("'job' column")) {
      const { job: _job, ...legacyMemberInsert } = memberInsert;
      ({ error: insertErr } = await supabase.from("members").insert(legacyMemberInsert));
      if (!insertErr) {
        console.warn("[Register] Saved member without job; migration 019 is pending");
      }
    }

    if (insertErr) {
      console.error("[Register] member insert error:", insertErr.message);
      return NextResponse.json(
        { error: "Failed to submit registration" },
        { status: 500 }
      );
    }

    if (masjid.contact_email) {
      const appUrl = getAppUrl(request.nextUrl.origin);
      const flagNote = dupResult.classification === "possible_duplicate"
        ? " <strong style='color:#b45309'>(flagged as possible duplicate — review carefully)</strong>"
        : "";
      try {
        await sendEmail({
          to: masjid.contact_email,
          subject: `New Member Registration — ${parsed.data.full_name} — ${masjid.name}`,
          html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#166534">New Member Registration Pending</h2>
            <p>A new member has registered and is awaiting your approval.</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <tr style="background:#f9fafb">
                <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Name</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb">${parsed.data.full_name}${flagNote}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Phone</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb">${parsed.data.phone}</td>
              </tr>
              ${parsed.data.email ? `<tr style="background:#f9fafb"><td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Email</td><td style="padding:10px 14px;border:1px solid #e5e7eb">${parsed.data.email}</td></tr>` : ""}
            </table>
            ${appUrl ? `<p><a href="${appUrl}/admin/members" style="display:inline-block;background:#166534;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Review Now</a></p>` : ""}
          </div>
        `,
          masjid_id: masjid.id,
        });
      } catch (emailErr) {
        console.error("[Register] admin notification failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      duplicate_flag: dupResult.classification,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
