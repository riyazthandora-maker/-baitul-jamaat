import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { memberRegistrationSchema } from "@/lib/validators/member";
import { detectDuplicates } from "@/lib/gemini";

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

    // Look up masjid
    const { data: masjid, error: masjidErr } = await supabase
      .from("masjids")
      .select("id, masjid_code, name")
      .eq("masjid_code", masjidCode)
      .maybeSingle();

    if (masjidErr || !masjid) {
      return NextResponse.json({ error: "Masjid not found" }, { status: 404 });
    }

    // Generate a stable ID for file paths before inserting the member row
    const memberId = crypto.randomUUID();
    const folder = `${masjid.id}/${memberId}`;

    // Upload ID document (mandatory)
    const idDocFile = formData.get("id_doc") as File | null;
    let id_doc_url: string | null = null;

    if (idDocFile && idDocFile.size > 0) {
      if (idDocFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "ID document exceeds 5 MB limit" },
          { status: 400 }
        );
      }
      const ext = idDocFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const bytes = await idDocFile.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from("member-documents")
        .upload(`${folder}/id_doc.${ext}`, bytes, {
          contentType: idDocFile.type,
          upsert: true,
        });
      if (uploadErr) {
        return NextResponse.json(
          { error: "Failed to upload ID document" },
          { status: 500 }
        );
      }
      id_doc_url = `${folder}/id_doc.${ext}`;
    } else {
      return NextResponse.json(
        { error: "ID document is required" },
        { status: 400 }
      );
    }

    // Upload photo (optional)
    const photoFile = formData.get("photo") as File | null;
    let photo_url: string | null = null;

    if (photoFile && photoFile.size > 0) {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const bytes = await photoFile.arrayBuffer();
      const { error: photoErr } = await supabase.storage
        .from("member-documents")
        .upload(`${folder}/photo.${ext}`, bytes, {
          contentType: photoFile.type,
          upsert: true,
        });
      if (!photoErr) {
        photo_url = `${folder}/photo.${ext}`;
      }
    }

    // Duplicate detection — fetch existing members of this masjid
    const { data: existingMembers } = await supabase
      .from("members")
      .select("phone, full_name, dob, member_number")
      .eq("masjid_id", masjid.id)
      .in("status", ["active", "pending"]);

    const dupResult = await detectDuplicates(
      {
        phone: parsed.data.phone,
        full_name: parsed.data.full_name,
        dob: parsed.data.dob ?? null,
      },
      (existingMembers ?? []).map((m) => ({
        phone: m.phone,
        full_name: m.full_name,
        dob: m.dob,
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
      duplicate_flag: dupResult.classification,
      duplicate_reason: dupResult.reason,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: "Failed to submit registration" },
        { status: 500 }
      );
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
