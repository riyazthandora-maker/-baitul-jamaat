import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getMissedBillingDates, runProgramBilling } from "@/lib/billing";

async function authorise(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") return null;

  const adminSupabase = await createAdminClient();
  const { data: program } = await adminSupabase
    .from("programs")
    .select("id, masjid_id, recurrence, start_date, end_date, last_billed_at, active")
    .eq("id", id)
    .maybeSingle();

  if (!program) return null;
  if (program.masjid_id !== (user.app_metadata?.masjid_id as string)) return null;

  return { adminSupabase, program };
}

// Preview: list of missed billing dates + enrolled member count
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await authorise(id);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { adminSupabase, program } = ctx;
  const missed = getMissedBillingDates(program, new Date());

  const { count: enrollment_count } = await adminSupabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("program_id", id)
    .eq("members.status", "active");

  return NextResponse.json({
    missed_dates: missed.map((d) => d.toISOString().slice(0, 10)),
    enrollment_count: enrollment_count ?? 0,
    recurrence: program.recurrence,
  });
}

// Execute catch-up billing for all missed periods
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await authorise(id);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { adminSupabase, program } = ctx;
  const missed = getMissedBillingDates(program, new Date());

  if (missed.length === 0) {
    return NextResponse.json({ results: [], message: "Nothing to catch up" });
  }

  const results: Array<{ period: string; created: number; skipped: number; errors: string[] }> = [];

  for (const date of missed) {
    const label =
      program.recurrence === "yearly"
        ? String(date.getFullYear())
        : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    const r = await runProgramBilling(adminSupabase, id, date);
    results.push({ period: label, ...r });
  }

  // Update last_billed_at to now
  await adminSupabase
    .from("programs")
    .update({ last_billed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ results });
}
