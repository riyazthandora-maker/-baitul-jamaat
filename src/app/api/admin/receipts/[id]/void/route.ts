import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { voidSchema } from "@/lib/validators/receipt";

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

  const body = await request.json();
  const parsed = voidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Void reason is required" }, { status: 400 });
  }

  const { data: before } = await supabase.from("receipts").select().eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.voided_at) return NextResponse.json({ error: "Already voided" }, { status: 409 });

  const now = new Date().toISOString();

  // Void the receipt
  const { data, error } = await supabase
    .from("receipts")
    .update({ voided_at: now, void_reason: parsed.data.reason })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also void the linked payment ledger entry
  await supabase
    .from("ledger")
    .update({ voided_at: now, void_reason: `Receipt voided: ${parsed.data.reason}` })
    .eq("receipt_id", id);

  await supabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "receipts",
    record_id: id,
    action: "void",
    before_data: before,
    after_data: data,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ receipt: data });
}
