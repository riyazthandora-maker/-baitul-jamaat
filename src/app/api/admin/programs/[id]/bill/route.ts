import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { runProgramBilling } from "@/lib/billing";

async function authoriseAndFetch(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") return null;

  const adminSupabase = await createAdminClient();
  const { data: program } = await adminSupabase
    .from("programs")
    .select("id, masjid_id, recurrence")
    .eq("id", id)
    .maybeSingle();

  if (!program) return null;
  const masjidId = user.app_metadata?.masjid_id as string;
  if (program.masjid_id !== masjidId) return null;

  return { adminSupabase, program };
}

// Preview: how many charges would run right now
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await authoriseAndFetch(id);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { adminSupabase } = ctx;
  const today = new Date().toISOString().slice(0, 10);

  const { data: enrollments } = await adminSupabase
    .from("enrollments")
    .select("id, member_id, members!inner(status)")
    .eq("program_id", id)
    .eq("members.status", "active");

  const totalEnrolled = (enrollments ?? []).length;

  const { count: alreadyBilled } = await adminSupabase
    .from("ledger")
    .select("id", { count: "exact", head: true })
    .eq("program_id", id)
    .like("period_key", `%:od:${today}`)
    .is("voided_at", null);

  const would_skip = alreadyBilled ?? 0;
  const would_create = Math.max(0, totalEnrolled - would_skip);

  return NextResponse.json({ would_create, would_skip });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await authoriseAndFetch(id);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { adminSupabase } = ctx;
  const result = await runProgramBilling(adminSupabase, id, billingDate);

  await adminSupabase
    .from("programs")
    .update({ last_billed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ...result, billedFor: dateStr });
}
