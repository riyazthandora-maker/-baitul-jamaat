import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStatementPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const [{ data: member }, { data: masjid }, { data: entries }] = await Promise.all([
    supabase.from("members").select("id, full_name, member_number, phone, email").eq("id", id).maybeSingle(),
    supabase.from("masjids").select("name, address").eq("id", masjidId).maybeSingle(),
    supabase
      .from("ledger")
      .select("created_at, type, amount, description")
      .eq("member_id", id)
      .eq("masjid_id", masjidId)
      .is("voided_at", null)
      .order("created_at", { ascending: true }),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!masjid) return NextResponse.json({ error: "Masjid not found" }, { status: 404 });
  if (!member.email) return NextResponse.json({ error: "Member has no email address" }, { status: 400 });

  const rows = entries ?? [];
  const charges = rows.filter((e) => e.type === "charge").reduce((s, e) => s + Number(e.amount), 0);
  const discounts = rows.filter((e) => e.type === "discount").reduce((s, e) => s + Number(e.amount), 0);
  const payments = rows.filter((e) => e.type === "payment").reduce((s, e) => s + Number(e.amount), 0);
  const balance = charges - discounts - payments;

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const pdfBytes = await generateStatementPdf({
    masjid,
    month: `As of ${today}`,
    members: [
      {
        full_name: member.full_name,
        member_number: member.member_number,
        phone: member.phone,
        charges,
        discounts,
        payments,
        balance,
        entries: rows.map((e) => ({
          created_at: e.created_at,
          type: e.type,
          amount: Number(e.amount),
          description: e.description,
        })),
      },
    ],
  });

  await sendEmail({
    to: member.email,
    subject: `Account Statement — ${masjid.name}`,
    html: `<p>Dear ${member.full_name},</p>
<p>Please find your account statement from <strong>${masjid.name}</strong> as of ${today}.</p>
${balance > 0 ? `<p>Outstanding balance: <strong>₹${balance.toFixed(2)}</strong></p>` : "<p>Your account is fully paid up.</p>"}
<p>Please contact the masjid office if you have any questions.</p>`,
    attachment: { filename: `statement-${member.member_number ?? id}.pdf`, content: Buffer.from(pdfBytes) },
    masjid_id: masjidId,
  });

  return NextResponse.json({ sent: true });
}
