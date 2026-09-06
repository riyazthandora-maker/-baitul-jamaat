import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateReceiptPdf } from "@/lib/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const adminSupabase = await createAdminClient();
  const { data: entry } = await adminSupabase
    .from("revenue_expenses")
    .select("*")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .eq("type", "revenue")
    .eq("entity_type", "contact")
    .is("deleted_at", null)
    .maybeSingle();

  if (!entry?.receipt_number) return new NextResponse("Receipt not found", { status: 404 });

  const [{ data: contact }, { data: masjid }] = await Promise.all([
    adminSupabase.from("contacts").select("name, phone").eq("id", entry.entity_id).maybeSingle(),
    adminSupabase.from("masjids").select("name, address, phone").eq("id", masjidId).maybeSingle(),
  ]);

  if (!contact || !masjid) return new NextResponse("Receipt details not found", { status: 404 });

  const pdfBytes = await generateReceiptPdf({
    receipt_number: entry.receipt_number,
    created_at: entry.created_at,
    amount: entry.amount,
    notes: entry.remarks,
    title: "REVENUE RECEIPT",
    payee: { name: contact.name, identifier: null, phone: contact.phone },
    masjid,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${entry.receipt_number}.pdf"`,
    },
  });
}
