import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, phone, profile_id")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = ["full_name", "phone", "email", "dob", "gender", "address", "qualification", "id_type", "id_last4"];
  const updates: Record<string, string | null> = {};

  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key] === "" ? null : body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  const { error: memberErr } = await adminSupabase
    .from("members")
    .update(updates)
    .eq("id", id);

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Keep profiles table in sync for name/phone
  if (member.profile_id && (updates.full_name || updates.phone)) {
    const profileUpdates: Record<string, string | null> = {};
    if (updates.full_name) profileUpdates.full_name = updates.full_name;
    if (updates.phone) profileUpdates.phone = updates.phone;
    await adminSupabase.from("profiles").update(profileUpdates).eq("id", member.profile_id);
  }

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "members",
    record_id: id,
    action: "admin_edit_profile",
    after_data: updates,
  });

  return NextResponse.json({ success: true });
}
