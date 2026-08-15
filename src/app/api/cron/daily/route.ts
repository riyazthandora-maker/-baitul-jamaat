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
      .select("id, name, address, phone, upi_id, contact_email")
      .eq("active", true);

    const statementResults: string[] = [];

    function sumByType(
      rows: Array<{ type: string; amount: string | number }>,
      type: string
    ) {
      return rows.filter((e) => e.type === type).reduce((s, e) => s + Number(e.amount), 0);
    }

    for (const masjid of masjids ?? []) {
      try {
        // Get admin email from profiles (fallback only)
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("masjid_id", masjid.id)
          .eq("role", "masjid_admin")
          .maybeSingle();

        // Fetch active members (include email for member notifications)
        const { data: members } = await supabase
          .from("members")
          .select("id, full_name, member_number, phone, email")
          .eq("masjid_id", masjid.id)
          .eq("status", "active");

        if (!members?.length) continue;

        // Fetch ALL non-voided ledger entries so we can compute opening balances
        const { data: allEntries } = await supabase
          .from("ledger")
          .select("member_id, type, amount, created_at, description")
          .eq("masjid_id", masjid.id)
          .is("voided_at", null)
          .order("created_at");

        // Split into before-period (opening balance) and in-period (this month)
        const beforeMap = new Map<string, typeof allEntries>();
        const periodMap = new Map<string, typeof allEntries>();
        for (const e of allEntries ?? []) {
          if (e.created_at < periodStart) {
            if (!beforeMap.has(e.member_id)) beforeMap.set(e.member_id, []);
            beforeMap.get(e.member_id)!.push(e);
          } else if (e.created_at <= periodEnd) {
            if (!periodMap.has(e.member_id)) periodMap.set(e.member_id, []);
            periodMap.get(e.member_id)!.push(e);
          }
        }

        const memberStatements = members.map((m) => {
          const before = beforeMap.get(m.id) ?? [];
          const period = periodMap.get(m.id) ?? [];

          const opening_balance =
            sumByType(before, "charge") + sumByType(before, "opening_balance")
            - sumByType(before, "discount") - sumByType(before, "payment");
          const charges = sumByType(period, "charge");
          const discounts = sumByType(period, "discount");
          const payments = sumByType(period, "payment");
          const closing_balance = opening_balance + charges - discounts - payments;

          return {
            full_name: m.full_name,
            member_number: m.member_number,
            phone: m.phone,
            email: m.email as string | null,
            opening_balance,
            charges,
            discounts,
            payments,
            balance: closing_balance,
            entries: period.map((e) => ({
              created_at: e.created_at,
              type: e.type,
              amount: Number(e.amount),
              description: e.description,
            })),
          };
        }).filter((m) => m.balance > 0 || m.charges > 0);

        if (!memberStatements.length) continue;

        const total_outstanding = memberStatements.reduce((s, m) => s + m.balance, 0);

        // ── Admin PDF statement ──────────────────────────────────
        const adminEmail = (masjid as { contact_email?: string | null }).contact_email
          ?? (adminProfile?.phone ? `${adminProfile.phone.replace(/\D/g, "")}@bj.local` : null);

        if (adminEmail) {
          const pdfBytes = await generateStatementPdf({
            masjid,
            month: monthLabel,
            total_outstanding,
            members: memberStatements,
          });

          await sendEmail({
            to: adminEmail,
            subject: `Monthly Statement — ${monthLabel} — ${masjid.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px">
                <h2 style="color:#166534">Monthly Statement — ${monthLabel}</h2>
                <p>Dear Admin, please find the statement for <strong>${masjid.name}</strong> attached.</p>
                <table style="border-collapse:collapse;width:100%;margin:12px 0">
                  <tr style="background:#f9fafb">
                    <td style="padding:8px 12px;border:1px solid #e5e7eb">Members with activity</td>
                    <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">${memberStatements.length}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;border:1px solid #e5e7eb">Total outstanding</td>
                    <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#991b1b">₹${total_outstanding.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            `,
            masjid_id: masjid.id,
            attachment: {
              filename: `statement-${monthLabel.replace(/\s+/g, "-")}.pdf`,
              content: Buffer.from(pdfBytes),
            },
          });
          statementResults.push(`${masjid.name}: admin PDF sent (${memberStatements.length} members)`);
        } else {
          statementResults.push(`${masjid.name}: admin PDF skipped — no contact email`);
        }

        // ── Per-member outstanding emails ────────────────────────
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const upiId = (masjid as { upi_id?: string | null }).upi_id;

        const memberEmailPromises = memberStatements
          .filter((m) => m.email && m.balance > 0)
          .map((m) =>
            sendEmail({
              to: m.email!,
              subject: `Your Outstanding Balance — ${masjid.name} — ${monthLabel}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <h2 style="color:#166534">Your Monthly Statement</h2>
                  <p>Assalamu Alaikum <strong>${m.full_name}</strong>${m.member_number ? ` (${m.member_number})` : ""},</p>
                  <p>Here is your statement for <strong>${monthLabel}</strong> from <strong>${masjid.name}</strong>.</p>
                  <table style="border-collapse:collapse;width:100%;margin:16px 0">
                    <tr style="background:#f9fafb">
                      <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151">Opening Balance</td>
                      <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:600;color:${m.opening_balance > 0 ? "#991b1b" : "#166534"}">₹${m.opening_balance.toFixed(2)}</td>
                    </tr>
                    ${m.charges > 0 ? `<tr><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151">Charges this month</td><td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;color:#991b1b">+ ₹${m.charges.toFixed(2)}</td></tr>` : ""}
                    ${m.discounts > 0 ? `<tr style="background:#f9fafb"><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151">Discounts</td><td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;color:#166534">− ₹${m.discounts.toFixed(2)}</td></tr>` : ""}
                    ${m.payments > 0 ? `<tr><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151">Payments received</td><td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;color:#166534">− ₹${m.payments.toFixed(2)}</td></tr>` : ""}
                    <tr style="background:#fef2f2">
                      <td style="padding:12px 14px;border:1px solid #fca5a5;font-weight:700;color:#991b1b">Total Outstanding</td>
                      <td style="padding:12px 14px;border:1px solid #fca5a5;text-align:right;font-weight:700;font-size:1.1em;color:#991b1b">₹${m.balance.toFixed(2)}</td>
                    </tr>
                  </table>
                  ${upiId ? `
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0">
                    <p style="margin:0;color:#166534;font-weight:600">Pay via GPay / UPI</p>
                    <p style="margin:6px 0 0;color:#374151;font-family:monospace;font-size:1.05em">${upiId}</p>
                  </div>` : ""}
                  <p style="color:#6b7280;font-size:0.875rem">Please contact the masjid if you have any questions about your balance.</p>
                  ${appUrl ? `<p><a href="${appUrl}/member/dashboard" style="display:inline-block;background:#166534;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View My Account</a></p>` : ""}
                </div>
              `,
              masjid_id: masjid.id,
            })
          );

        await Promise.all(memberEmailPromises);

        const memberEmailCount = memberStatements.filter((m) => m.email && m.balance > 0).length;
        if (memberEmailCount > 0) {
          statementResults.push(`${masjid.name}: ${memberEmailCount} member emails sent`);
        }
      } catch (err) {
        statementResults.push(`${masjid.name}: failed — ${err}`);
      }
    }

    results.statements = statementResults;
  }

  return NextResponse.json({ ok: true, date: today.toISOString(), ...results });
}
