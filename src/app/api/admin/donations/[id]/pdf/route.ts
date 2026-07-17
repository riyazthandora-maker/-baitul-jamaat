import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReceiptPdf } from "@/lib/pdf";

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

  const { data: donation } = await supabase
    .from("donations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!donation) return new NextResponse("Not found", { status: 404 });

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, address, phone")
    .eq("id", masjidId)
    .maybeSingle();

  if (!masjid) return new NextResponse("Masjid not found", { status: 404 });

  const pdfBytes = await generateReceiptPdf({
    title: "DONATION RECEIPT",
    receipt_number: donation.receipt_number,
    created_at: donation.created_at,
    amount: donation.amount,
    notes: donation.purpose,
    payee: {
      name: donation.donor_name,
      identifier: donation.donor_phone ?? null,
      phone: donation.donor_phone ?? null,
    },
    masjid,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${donation.receipt_number}.pdf"`,
    },
  });
}
