import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json().catch(() => ({}));
  const balances: Array<{ member_id: string; amount: number }> = body.balances ?? [];

  if (!Array.isArray(balances)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = { saved: 0, cleared: 0, errors: [] as string[] };

  for (const item of balances) {
    const amount = Number(item.amount ?? 0);
    if (isNaN(amount) || amount < 0) continue;

    await supabase
      .from("ledger")
      .delete()
      .eq("member_id", item.member_id)
      .eq("masjid_id", masjidId)
      .eq("type", "opening_balance");

    if (amount > 0) {
      const { error } = await supabase.from("ledger").insert({
        masjid_id: masjidId,
        member_id: item.member_id,
        type: "opening_balance",
        amount,
        description: "Opening balance (migration)",
        period_key: `ob:${item.member_id}`,
      });
      if (error) {
        results.errors.push(`${item.member_id}: ${error.message}`);
      } else {
        results.saved++;
      }
    } else {
      results.cleared++;
    }
  }

  return NextResponse.json(results);
}
