import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStatementPdf } from "@/lib/pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return new NextResponse("Unauthorized", { status: 401 });
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

  if (!member) return new NextResponse("Member not found", { status: 404 });
  if (!masjid) return new NextResponse("Masjid not found", { status: 404 });

  const rows = entries ?? [];
  const charges = rows.filter((e) => e.type === "charge").reduce((s, e) => s + Number(e.amount), 0);
  const discounts = rows.filter((e) => e.type === "discount").reduce((s, e) => s + Number(e.amount), 0);
  const payments = rows.filter((e) => e.type === "payment").reduce((s, e) => s + Number(e.amount), 0);

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
        balance: charges - discounts - payments,
        entries: rows.map((e) => ({
          created_at: e.created_at,
          type: e.type,
          amount: Number(e.amount),
          description: e.description,
        })),
      },
    ],
  });

  const filename = `statement-${member.member_number ?? id}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
