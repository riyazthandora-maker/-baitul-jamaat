import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount ?? 0);
  if (isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Verify member belongs to this masjid
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Remove any existing opening_balance entry for this member
  await supabase
    .from("ledger")
    .delete()
    .eq("member_id", id)
    .eq("masjid_id", masjidId)
    .eq("type", "opening_balance");

  if (amount > 0) {
    const { error } = await supabase.from("ledger").insert({
      masjid_id: masjidId,
      member_id: id,
      type: "opening_balance",
      amount,
      description: "Opening balance (migration)",
      period_key: `ob:${id}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "ledger",
    record_id: id,
    action: "set_opening_balance",
    after_data: { member_id: id, amount },
  });

  return NextResponse.json({ success: true });
}
