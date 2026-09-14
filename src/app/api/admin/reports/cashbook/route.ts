import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

interface RawEntry {
  id: string;
  txn_date: string;       // "YYYY-MM-DD"
  sort_ts: string;
  entity_name: string;
  category: string;
  sub_category: string;
  cash_in: number | string;
  cash_out: number | string;
  reference: string;
  running_balance: number | string;
}

export interface CashBookEntry {
  id: string;
  txn_date: string;
  entity_name: string;
  category: string;
  sub_category: string;
  cash_in: number;
  cash_out: number;
  reference: string;
  running_balance: number;
}

// GET /api/admin/reports/cashbook?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from") ?? null;  // YYYY-MM-DD
  const to   = sp.get("to")   ?? null;  // YYYY-MM-DD

  const adminSupabase = await createAdminClient();

  const { data, error } = await adminSupabase.rpc("get_cashbook", {
    p_masjid_id: masjidId,
  });

  if (error) {
    console.error("[CashBook]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allEntries: CashBookEntry[] = ((data ?? []) as RawEntry[]).map((r) => ({
    id:              r.id,
    txn_date:        r.txn_date,
    entity_name:     r.entity_name,
    category:        r.category,
    sub_category:    r.sub_category,
    cash_in:         Number(r.cash_in),
    cash_out:        Number(r.cash_out),
    reference:       r.reference,
    running_balance: Number(r.running_balance),
  }));

  // Opening balance = running_balance of last entry strictly before `from`
  let openingBalance = 0;
  if (from) {
    const before = allEntries.filter((e) => e.txn_date < from);
    if (before.length > 0) {
      openingBalance = before[before.length - 1].running_balance;
    }
  }

  // Filter to requested range
  const entries = allEntries.filter((e) => {
    if (from && e.txn_date < from) return false;
    if (to   && e.txn_date > to)   return false;
    return true;
  });

  const totalIn  = entries.reduce((s, e) => s + e.cash_in,  0);
  const totalOut = entries.reduce((s, e) => s + e.cash_out, 0);

  return NextResponse.json({
    opening_balance:  openingBalance,
    entries,
    totals: { cash_in: totalIn, cash_out: totalOut, net: totalIn - totalOut },
    closing_balance:  openingBalance + totalIn - totalOut,
  });
}
