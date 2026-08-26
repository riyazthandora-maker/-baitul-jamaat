import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
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

  const body = await request.json().catch(() => ({}));
  const reason: string | null = body.reason?.trim() || null;

  const { data: changeReq } = await supabase
    .from("profile_change_requests")
    .select("id")
    .eq("member_id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (!changeReq) {
    return NextResponse.json({ error: "No pending change request found" }, { status: 404 });
  }

  await adminSupabase
    .from("profile_change_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      reject_reason: reason,
    })
    .eq("id", changeReq.id);

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "profile_change_requests",
    record_id: changeReq.id,
    action: "reject_profile_change",
    after_data: { reason },
  });

  return NextResponse.json({ success: true });
}
