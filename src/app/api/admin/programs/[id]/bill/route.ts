import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { runProgramBilling } from "@/lib/billing";

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

  const body = await request.json();
  const { date: dateStr } = body as { date?: string };
  if (!dateStr) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const billingDate = new Date(dateStr + "T00:00:00");
  if (isNaN(billingDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (billingDate < todayStart) {
    return NextResponse.json({ error: "Billing date cannot be in the past" }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();

  const { data: program } = await adminSupabase
    .from("programs")
    .select("id, masjid_id")
    .eq("id", id)
    .maybeSingle();

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  if (program.masjid_id !== masjidId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await runProgramBilling(adminSupabase, id, billingDate);

  await adminSupabase
    .from("programs")
    .update({ last_billed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ...result, billedFor: dateStr });
}
