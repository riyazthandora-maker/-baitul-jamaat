import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { memberRegistrationSchema } from "@/lib/validators/member";
import { detectDuplicates } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";

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
      dob: (formData.get("dob") as string) || null,
      gender: (formData.get("gender") as string) || null,
      address: (formData.get("address") as string) || null,
      id_type: (formData.get("id_type") as string) || null,
      id_last4: (formData.get("id_last4") as string) || null,
      qualification: formData.get("qualification") as string,
    };

    const parsed = memberRegistrationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Raw service-role client — needed for storage uploads (SSR client doesn't bypass storage RLS)
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

    // Generate a stable ID for file paths before inserting the member row
    const memberId = crypto.randomUUID();
    const folder = `${masjid.id}/${memberId}`;

    // Ensure bucket exists (creates it if migration 005 wasn't run)
    await supabase.storage.createBucket("member-documents", { public: false }).catch(() => {});

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

    // Upload ID document front (mandatory)
    const idDocFront = formData.get("id_doc_front") as File | null;
    if (!idDocFront || idDocFront.size === 0) {
      return NextResponse.json({ error: "Front of ID document is required" }, { status: 400 });
    }
    if (idDocFront.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ID document exceeds 5 MB limit" }, { status: 400 });
    }
    const id_doc_url = await uploadFile(idDocFront, `${folder}/id_doc_front.${ext(idDocFront)}`);
    if (!id_doc_url) {
      return NextResponse.json({ error: "Failed to upload ID document front" }, { status: 500 });
    }

    // Upload ID document back (optional)
    const idDocBack = formData.get("id_doc_back") as File | null;
    let id_doc_back_url: string | null = null;
    if (idDocBack && idDocBack.size > 0 && idDocBack.size <= 5 * 1024 * 1024) {
      id_doc_back_url = await uploadFile(idDocBack, `${folder}/id_doc_back.${ext(idDocBack)}`);
    }

    // Upload photo (optional)
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

    // Gemini name + address fuzzy match
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

    // Hard reject on exact duplicate
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

    // Insert member row (service role bypasses RLS)
    const { error: insertErr } = await supabase.from("members").insert({
      id: memberId,
      masjid_id: masjid.id,
      status: "pending",
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      address: parsed.data.address || null,
      id_type: parsed.data.id_type || null,
      id_last4: parsed.data.id_last4 || null,
      qualification: parsed.data.qualification,
      photo_url,
      id_doc_url,
      id_doc_back_url,
      duplicate_flag: dupResult.classification,
      duplicate_reason: dupResult.reason,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "Failed to submit registration" },
        { status: 500 }
      );
    }

    // Gap 6: notify masjid admin of the new pending registration
    if (masjid.contact_email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const flagNote = dupResult.classification === "possible_duplicate"
        ? " <strong style='color:#b45309'>(flagged as possible duplicate — review carefully)</strong>"
        : "";
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
