import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discountSchema } from "@/lib/validators/program";

// GET /api/admin/ledger?member_id=...
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = request.nextUrl.searchParams.get("member_id");
  let query = supabase
    .from("ledger")
    .select("*, programs(name), members(full_name, member_number)")
    .order("created_at", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST /api/admin/ledger — add manual discount
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ledger")
    .insert({
      masjid_id: masjidId,
      member_id: parsed.data.member_id,
      program_id: parsed.data.program_id ?? null,
      type: "discount",
      amount: parsed.data.amount,
      description: parsed.data.description,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "ledger",
    record_id: data.id,
    action: "insert_discount",
    after_data: data,
  });

  return NextResponse.json({ entry: data }, { status: 201 });
}
