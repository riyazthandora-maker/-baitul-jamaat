import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function ext(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ request: null });

  const { data: pending } = await supabase
    .from("profile_change_requests")
    .select("*")
    .eq("member_id", member.id)
    .eq("status", "pending")
    .maybeSingle();

  return NextResponse.json({ request: pending ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, phone, email, qualification, id_type, id_last4, photo_url")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Member record not found" }, { status: 404 });
  }

  // Block if pending request already exists
  const { data: existing } = await supabase
    .from("profile_change_requests")
    .select("id")
    .eq("member_id", member.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending change request. Wait for admin review." },
      { status: 409 }
    );
  }

  const formData = await request.formData();

  const changes: Record<string, string> = {};
  const fields = ["full_name", "phone", "email", "qualification", "id_type", "id_last4"] as const;

  for (const field of fields) {
    const val = (formData.get(field) as string | null)?.trim() ?? "";
    const current = (member[field] ?? "") as string;
    if (val !== current) {
      changes[field] = val;
    }
  }

  // Handle photo upload
  let newPhotoUrl: string | null = null;
  const photoFile = formData.get("photo") as File | null;
  if (photoFile && photoFile.size > 0) {
    const path = `${masjidId}/${member.id}/profile_change.${ext(photoFile)}`;
    const { error: uploadErr } = await adminSupabase.storage
      .from("member-documents")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadErr) {
      return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
    }
    newPhotoUrl = path;
  }

  if (Object.keys(changes).length === 0 && !newPhotoUrl) {
    return NextResponse.json({ error: "No changes detected" }, { status: 400 });
  }

  const { error: insertErr } = await adminSupabase
    .from("profile_change_requests")
    .insert({
      masjid_id: masjidId,
      member_id: member.id,
      changes,
      new_photo_url: newPhotoUrl,
      status: "pending",
    });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
