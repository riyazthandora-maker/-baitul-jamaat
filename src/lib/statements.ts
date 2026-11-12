import type { SupabaseClient } from "@supabase/supabase-js";

export type LedgerType = "charge" | "discount" | "payment" | "opening_balance";

export interface StatementMember {
  id: string;
  full_name: string;
  member_number: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface StatementMasjid {
  name: string;
  address: string;
  phone: string;
}

export interface StatementLedgerRow {
  id: string;
  type: LedgerType;
  amount: number | string;
  description: string | null;
  created_at: string;
  transaction_date: string | null;
}

export interface StatementEntry {
  id: string;
  date: string;
  type: LedgerType;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface MemberStatement {
  member: StatementMember;
  masjid: StatementMasjid;
  month: string;
  monthLabel: string;
  openingBalance: number;
  charges: number;
  discounts: number;
  payments: number;
  closingBalance: number;
  entries: StatementEntry[];
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function istDatePart(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The current calendar month in India, formatted as YYYY-MM. */
export function currentIstMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

export function isValidMonth(value: string | null | undefined): boolean {
  return Boolean(value && MONTH_RE.test(value));
}

export function normalizeMonth(value: string | null | undefined): string {
  return isValidMonth(value) ? (value as string) : currentIstMonth();
}

export function monthLabelFor(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Ledger rows use the user-supplied service date when set, else the IST date of creation. */
export function effectiveDate(row: {
  created_at: string;
  transaction_date?: string | null;
}): string {
  if (row.transaction_date) return row.transaction_date.slice(0, 10);
  return istDatePart(row.created_at);
}

function defaultDescription(type: LedgerType): string {
  switch (type) {
    case "charge":
      return "Charge";
    case "payment":
      return "Payment";
    case "discount":
      return "Discount";
    default:
      return "Opening balance";
  }
}

export function buildMemberStatement(input: {
  member: StatementMember;
  masjid: StatementMasjid;
  rows: StatementLedgerRow[];
  month?: string | null;
}): MemberStatement {
  const month = normalizeMonth(input.month);
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth =
    monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;

  const rows = [...input.rows].sort((a, b) => {
    const dateA = effectiveDate(a);
    const dateB = effectiveDate(b);
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  let opening = 0;
  let charges = 0;
  let discounts = 0;
  let payments = 0;
  const periodRows: StatementLedgerRow[] = [];

  for (const row of rows) {
    const amount = Number(row.amount);
    // Migration rows define the starting balance and never appear as month activity.
    if (row.type === "opening_balance") {
      opening += amount;
      continue;
    }

    const date = effectiveDate(row);
    const signed = row.type === "charge" ? amount : -amount;

    if (date < monthStart) {
      opening += signed;
    } else if (date < nextMonth) {
      periodRows.push(row);
      if (row.type === "charge") charges += amount;
      else if (row.type === "discount") discounts += amount;
      else if (row.type === "payment") payments += amount;
    }
  }

  let running = opening;
  const entries: StatementEntry[] = periodRows.map((row) => {
    const amount = Number(row.amount);
    const debit = row.type === "charge" ? amount : 0;
    const credit = row.type === "payment" || row.type === "discount" ? amount : 0;
    running += debit - credit;

    const base = row.description?.trim() || defaultDescription(row.type);
    const description =
      row.type === "discount" && !/discount/i.test(base)
        ? `Discount — ${base}`
        : base;

    return {
      id: row.id,
      date: effectiveDate(row),
      type: row.type,
      description,
      debit: round2(debit),
      credit: round2(credit),
      balance: round2(running),
    };
  });

  return {
    member: input.member,
    masjid: input.masjid,
    month,
    monthLabel: monthLabelFor(month),
    openingBalance: round2(opening),
    charges: round2(charges),
    discounts: round2(discounts),
    payments: round2(payments),
    closingBalance: round2(opening + charges - discounts - payments),
    entries,
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function buildStatementEmailHtml(statement: MemberStatement): string {
  const name = escapeHtml(statement.member.full_name);
  const masjid = escapeHtml(statement.masjid.name);
  const closing = statement.closingBalance;
  const closingLabel = closing > 0 ? "Amount due" : closing < 0 ? "Advance / credit" : "Balance";
  const closingColor = closing > 0 ? "#b91c1c" : "#166534";

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#374151">${label}</td><td style="padding:6px 0;text-align:right;color:#111827">${value}</td></tr>`;

  return `
<div style="font-family:sans-serif;max-width:600px;color:#111827">
  <h2 style="color:#166534;margin-bottom:4px">Account Statement — ${escapeHtml(statement.monthLabel)}</h2>
  <p style="margin-top:0;color:#6b7280">${masjid}</p>
  <p>Dear ${name},</p>
  <p>Please find your account statement for <strong>${escapeHtml(statement.monthLabel)}</strong> attached as a PDF.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${row("Opening balance", `₹${statement.openingBalance.toFixed(2)}`)}
    ${row("Charges", `₹${statement.charges.toFixed(2)}`)}
    ${row("Discounts", `₹${statement.discounts.toFixed(2)}`)}
    ${row("Payments", `₹${statement.payments.toFixed(2)}`)}
    <tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;font-weight:600">${closingLabel}</td><td style="padding:10px 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;color:${closingColor}">₹${Math.abs(closing).toFixed(2)}</td></tr>
  </table>
  <p>Please contact the masjid office if you have any questions about this statement.</p>
</div>`;
}

export async function loadMemberStatement(
  supabase: SupabaseClient,
  opts: {
    masjidId: string;
    memberId?: string;
    profileId?: string;
    month?: string | null;
  }
): Promise<MemberStatement | null> {
  let memberQuery = supabase
    .from("members")
    .select("id, full_name, member_number, phone, email, address, created_at")
    .eq("masjid_id", opts.masjidId);

  if (opts.memberId) {
    memberQuery = memberQuery.eq("id", opts.memberId);
  } else if (opts.profileId) {
    memberQuery = memberQuery.eq("profile_id", opts.profileId);
  } else {
    return null;
  }

  const { data: member } = await memberQuery.maybeSingle();
  if (!member) return null;

  const [{ data: masjid }, { data: rows }] = await Promise.all([
    supabase
      .from("masjids")
      .select("name, address, phone")
      .eq("id", opts.masjidId)
      .maybeSingle(),
    supabase
      .from("ledger")
      .select("id, type, amount, description, created_at, transaction_date")
      .eq("member_id", (member as StatementMember).id)
      .eq("masjid_id", opts.masjidId)
      .is("voided_at", null)
      .order("created_at", { ascending: true }),
  ]);

  if (!masjid) return null;

  return buildMemberStatement({
    member: member as unknown as StatementMember,
    masjid: masjid as unknown as StatementMasjid,
    rows: (rows ?? []) as unknown as StatementLedgerRow[],
    month: opts.month,
  });
}
