import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStatementPdf } from "@/lib/pdf";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  // month param: YYYY-MM, defaults to current month
  const monthParam = request.nextUrl.searchParams.get("month");
  const now = new Date();
  const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();
  const periodStart = new Date(year, month, 1).toISOString();
  const periodEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, address")
    .eq("id", masjidId)
    .maybeSingle();

  if (!masjid) return new NextResponse("Masjid not found", { status: 404 });

  // Fetch all active members
  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, member_number, phone")
    .eq("masjid_id", masjidId)
    .eq("status", "active");

  if (!members?.length) {
    return new NextResponse("No active members", { status: 404 });
  }

  // Fetch ledger entries for the period for this masjid
  const { data: allEntries } = await supabase
    .from("ledger")
    .select("*")
    .eq("masjid_id", masjidId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)
    .is("voided_at", null)
    .order("created_at");

  const entriesMap = new Map<string, typeof allEntries>();
  for (const e of allEntries ?? []) {
    if (!entriesMap.has(e.member_id)) entriesMap.set(e.member_id, []);
    entriesMap.get(e.member_id)!.push(e);
  }

  const memberStatements = members.map((m) => {
    const entries = entriesMap.get(m.id) ?? [];
    const charges = entries.filter((e) => e.type === "charge").reduce((s, e) => s + Number(e.amount), 0);
    const discounts = entries.filter((e) => e.type === "discount").reduce((s, e) => s + Number(e.amount), 0);
    const payments = entries.filter((e) => e.type === "payment").reduce((s, e) => s + Number(e.amount), 0);
    return {
      full_name: m.full_name,
      member_number: m.member_number,
      phone: m.phone,
      charges,
      discounts,
      payments,
      balance: charges - discounts - payments,
      entries: entries.map((e) => ({
        created_at: e.created_at,
        type: e.type,
        amount: Number(e.amount),
        description: e.description,
      })),
    };
  }).filter((m) => m.charges > 0 || m.balance !== 0);

  if (!memberStatements.length) {
    return new NextResponse("No transactions this period", { status: 404 });
  }

  const pdfBytes = await generateStatementPdf({
    masjid,
    month: monthLabel,
    members: memberStatements,
  });

  const filename = `statement-${year}-${String(month + 1).padStart(2, "0")}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
