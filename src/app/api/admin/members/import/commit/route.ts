import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateRow, dmyToIso } from "@/lib/csv-import";
import type { ImportRow } from "@/lib/csv-import";

const MAX_ROWS = 500;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows: ImportRow[] = body.rows.map((r: ImportRow) => ({
    ...r,
    opening_balance: r.opening_balance?.trim() || "0",
  }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  // Re-validate all rows server-side
  const revalidated = rows.map((row, i) => validateRow(row, i + 1));
  const invalidRows = revalidated.filter((r) => r.status === "error");
  if (invalidRows.length > 0) {
    return NextResponse.json(
      { error: "Some rows failed validation", details: invalidRows },
      { status: 400 }
    );
  }

  const adminSupabase = await createAdminClient();

  const rpcRows = rows.map((r) => ({
    ...r,
    date_of_birth: dmyToIso(r.date_of_birth),
  }));

  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
    "bulk_import_members",
    {
      p_masjid_id: masjidId,
      p_rows: rpcRows,
      p_actor_id: user.id,
    }
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const results = (rpcResult as Array<{
    member_id: string | null;
    member_number: string | null;
    phone: string;
    full_name: string;
    opening_balance_added: boolean;
    success: boolean;
    error: string | null;
  }>);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    succeeded,
    failed,
    results: results.map((r) => ({
      phone: r.phone,
      full_name: r.full_name,
      member_number: r.member_number ?? undefined,
      error: r.error ?? undefined,
    })),
  });
}
