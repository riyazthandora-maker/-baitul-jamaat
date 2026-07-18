import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateStatementPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createAdminClient();
  const today = new Date();
  const results: Record<string, unknown> = {};

  // ── Month-start statement emails (runs on 1st only) ────────
  if (today.getDate() === 1) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const year = prevMonth.getFullYear();
    const month = prevMonth.getMonth();
    const periodStart = new Date(year, month, 1).toISOString();
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const monthLabel = prevMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const { data: masjids } = await supabase
      .from("masjids")
      .select("id, name, address, phone")
      .eq("active", true);

    const statementResults: string[] = [];

    for (const masjid of masjids ?? []) {
      // Get admin email from profiles
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("masjid_id", masjid.id)
        .eq("role", "masjid_admin")
        .maybeSingle();

      // Fetch active members and their ledger for the previous month
      const { data: members } = await supabase
        .from("members")
        .select("id, full_name, member_number, phone")
        .eq("masjid_id", masjid.id)
        .eq("status", "active");

      if (!members?.length) continue;

      const { data: entries } = await supabase
        .from("ledger")
        .select("*")
        .eq("masjid_id", masjid.id)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd)
        .is("voided_at", null);

      const entriesMap = new Map<string, typeof entries>();
      for (const e of entries ?? []) {
        if (!entriesMap.has(e.member_id)) entriesMap.set(e.member_id, []);
        entriesMap.get(e.member_id)!.push(e);
      }

      const memberStatements = members.map((m) => {
        const mes = entriesMap.get(m.id) ?? [];
        const charges = mes.filter((e) => e.type === "charge").reduce((s, e) => s + Number(e.amount), 0);
        const discounts = mes.filter((e) => e.type === "discount").reduce((s, e) => s + Number(e.amount), 0);
        const payments = mes.filter((e) => e.type === "payment").reduce((s, e) => s + Number(e.amount), 0);
        return {
          full_name: m.full_name,
          member_number: m.member_number,
          phone: m.phone,
          charges,
          discounts,
          payments,
          balance: charges - discounts - payments,
          entries: (mes ?? []).map((e) => ({
            created_at: e.created_at,
            type: e.type,
            amount: Number(e.amount),
            description: e.description,
          })),
        };
      }).filter((m) => m.charges > 0 || m.balance !== 0);

      if (!memberStatements.length) continue;

      try {
        const pdfBytes = await generateStatementPdf({
          masjid,
          month: monthLabel,
          members: memberStatements,
        });

        // Admin email uses phone-based address; without a real email column
        // this goes to the outbox table as a logged artifact.
        const adminEmail = adminProfile?.phone
          ? `${adminProfile.phone}@bj.local`
          : `admin-${masjid.id}@bj.local`;
        await sendEmail({
          to: adminEmail,
          subject: `Monthly Statement — ${monthLabel} — ${masjid.name}`,
          html: `<p>Dear Admin,</p>
<p>The monthly statement for <strong>${monthLabel}</strong> is attached.</p>
<p>Total members with activity: ${memberStatements.length}</p>
<p>Total outstanding: ₹${memberStatements.reduce((s, m) => s + m.balance, 0).toFixed(2)}</p>`,
          masjid_id: masjid.id,
          attachment: { filename: `statement-${monthLabel.replace(/\s+/g, "-")}.pdf`, content: Buffer.from(pdfBytes) },
        });
        statementResults.push(`${masjid.name}: ${memberStatements.length} members`);
      } catch (err) {
        statementResults.push(`${masjid.name}: failed — ${err}`);
      }
    }

    results.statements = statementResults;
  }

  return NextResponse.json({ ok: true, date: today.toISOString(), ...results });
}
