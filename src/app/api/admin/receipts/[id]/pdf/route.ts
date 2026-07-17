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

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*, members(full_name, member_number, phone)")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) return new NextResponse("Not found", { status: 404 });

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, address, phone")
    .eq("id", masjidId)
    .maybeSingle();

  if (!masjid) return new NextResponse("Masjid not found", { status: 404 });

  const member = receipt.members as { full_name: string; member_number: string | null; phone: string };

  const pdfBytes = await generateReceiptPdf({
    receipt_number: receipt.receipt_number,
    created_at: receipt.created_at,
    amount: receipt.amount,
    notes: receipt.notes,
    member,
    masjid,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receipt_number}.pdf"`,
    },
  });
}
