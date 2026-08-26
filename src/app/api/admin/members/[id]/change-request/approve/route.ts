import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
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

  const { data: changeReq } = await supabase
    .from("profile_change_requests")
    .select("*")
    .eq("member_id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (!changeReq) {
    return NextResponse.json({ error: "No pending change request found" }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("profile_id")
    .eq("id", id)
    .maybeSingle();

  // Apply changes to members table
  const memberUpdates: Record<string, string | null> = { ...changeReq.changes };
  if (changeReq.new_photo_url) {
    memberUpdates.photo_url = changeReq.new_photo_url;
  }

  const { error: updateErr } = await adminSupabase
    .from("members")
    .update(memberUpdates)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Sync profile name/phone if changed
  if (member?.profile_id) {
    const profileUpdates: Record<string, string | null> = {};
    if (changeReq.changes.full_name) profileUpdates.full_name = changeReq.changes.full_name;
    if (changeReq.changes.phone) profileUpdates.phone = changeReq.changes.phone;
    if (Object.keys(profileUpdates).length > 0) {
      await adminSupabase.from("profiles").update(profileUpdates).eq("id", member.profile_id);
    }
  }

  // Mark request approved
  await adminSupabase
    .from("profile_change_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", changeReq.id);

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "members",
    record_id: id,
    action: "approve_profile_change",
    after_data: memberUpdates,
  });

  return NextResponse.json({ success: true });
}
