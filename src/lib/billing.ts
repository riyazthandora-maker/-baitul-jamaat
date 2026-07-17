import type { SupabaseClient } from "@supabase/supabase-js";

export function computePeriodKey(
  programId: string,
  memberId: string,
  date: Date,
  recurrence: "monthly" | "yearly"
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return recurrence === "monthly"
    ? `${programId}:${memberId}:${year}-${month}`
    : `${programId}:${memberId}:${year}`;
}

export function isBillingDue(
  program: { start_date: string; end_date: string | null; recurrence: string },
  today: Date
): boolean {
  const start = new Date(program.start_date + "T00:00:00");
  const end = program.end_date
    ? new Date(program.end_date + "T00:00:00")
    : null;

  if (today < start) return false;
  if (end && today > end) return false;

  if (program.recurrence === "monthly") {
    return today.getDate() === start.getDate();
  }
  if (program.recurrence === "yearly") {
    return (
      today.getMonth() === start.getMonth() &&
      today.getDate() === start.getDate()
    );
  }
  return false;
}

export async function runBillingCycle(
  supabase: SupabaseClient,
  date: Date
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const result = { created: 0, skipped: 0, errors: [] as string[] };

  // Fetch all active programs
  const { data: programs, error: progErr } = await supabase
    .from("programs")
    .select("id, masjid_id, name, default_amount, recurrence, start_date, end_date")
    .eq("active", true);

  if (progErr) {
    result.errors.push(`Failed to fetch programs: ${progErr.message}`);
    return result;
  }

  for (const program of programs ?? []) {
    if (!isBillingDue(program, date)) continue;

    // Fetch enrollments for this program with active members
    const { data: enrollments, error: enrollErr } = await supabase
      .from("enrollments")
      .select("id, member_id, amount, members!inner(status)")
      .eq("program_id", program.id)
      .eq("members.status", "active");

    if (enrollErr) {
      result.errors.push(
        `Program ${program.id}: enrollment fetch failed: ${enrollErr.message}`
      );
      continue;
    }

    for (const enrollment of enrollments ?? []) {
      const periodKey = computePeriodKey(
        program.id,
        enrollment.member_id,
        date,
        program.recurrence as "monthly" | "yearly"
      );

      const { error: insertErr } = await supabase.from("ledger").insert({
        masjid_id: program.masjid_id,
        member_id: enrollment.member_id,
        program_id: program.id,
        enrollment_id: enrollment.id,
        type: "charge",
        amount: enrollment.amount,
        description: program.name,
        period_key: periodKey,
      });

      if (insertErr) {
        if (
          insertErr.code === "23505" ||
          insertErr.message.includes("unique")
        ) {
          // Duplicate — already billed this period
          result.skipped++;
        } else {
          result.errors.push(
            `Charge insert failed (${periodKey}): ${insertErr.message}`
          );
        }
      } else {
        result.created++;
      }
    }
  }

  return result;
}

export async function runProgramBilling(
  supabase: SupabaseClient,
  programId: string,
  date: Date
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const result = { created: 0, skipped: 0, errors: [] as string[] };

  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("id, masjid_id, name, default_amount, recurrence, start_date, end_date, active")
    .eq("id", programId)
    .maybeSingle();

  if (progErr || !program) {
    result.errors.push("Program not found");
    return result;
  }

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("id, member_id, amount, members!inner(status)")
    .eq("program_id", programId)
    .eq("members.status", "active");

  if (enrollErr) {
    result.errors.push(`Enrollment fetch failed: ${enrollErr.message}`);
    return result;
  }

  for (const enrollment of enrollments ?? []) {
    const periodKey = computePeriodKey(
      programId,
      enrollment.member_id,
      date,
      program.recurrence as "monthly" | "yearly"
    );

    const { error: insertErr } = await supabase.from("ledger").insert({
      masjid_id: program.masjid_id,
      member_id: enrollment.member_id,
      program_id: programId,
      enrollment_id: enrollment.id,
      type: "charge",
      amount: enrollment.amount,
      description: program.name,
      period_key: periodKey,
    });

    if (insertErr) {
      if (insertErr.code === "23505" || insertErr.message.includes("unique")) {
        result.skipped++;
      } else {
        result.errors.push(`Charge insert failed (${periodKey}): ${insertErr.message}`);
      }
    } else {
      result.created++;
    }
  }

  return result;
}

export async function getMemberBalance(
  supabase: SupabaseClient,
  memberId: string
): Promise<number> {
  const { data } = await supabase
    .from("ledger")
    .select("type, amount")
    .eq("member_id", memberId)
    .is("voided_at", null);

  if (!data) return 0;

  return data.reduce((sum, entry) => {
    if (entry.type === "charge") return sum + Number(entry.amount);
    return sum - Number(entry.amount);
  }, 0);
}
