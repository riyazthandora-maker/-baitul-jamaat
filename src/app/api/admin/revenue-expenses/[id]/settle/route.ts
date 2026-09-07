import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateReceiptPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const adminSupabase = await createAdminClient();

  let { data: entry, error } = await adminSupabase.rpc("settle_expense_voucher", {
    p_masjid_id: masjidId,
    p_actor_id: user.id,
    p_entry_id: id,
  });

  if (error) {
    console.error("[Settle] RPC failed; using direct compatibility path:", error.message);

    const { data: existing, error: lookupError } = await adminSupabase
      .from("revenue_expenses")
      .select("*")
      .eq("id", id)
      .eq("masjid_id", masjidId)
      .eq("type", "expense")
      .eq("entity_type", "contact")
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Pending expense entry not found" }, { status: 404 });
    }

    if (!existing.voucher_number) {
      const sequence = await adminSupabase.rpc("next_expense_voucher_number", {
        p_masjid_id: masjidId,
        p_year: Number(String(existing.date).slice(0, 4)),
      });
      if (sequence.error || !sequence.data) {
        return NextResponse.json(
          { error: sequence.error?.message ?? "Unable to generate voucher" },
          { status: 400 }
        );
      }
      const updated = await adminSupabase
        .from("revenue_expenses")
        .update({ voucher_number: sequence.data, is_paid: true })
        .eq("id", id)
        .eq("masjid_id", masjidId)
        .is("voucher_number", null)
        .select()
        .maybeSingle();
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
      entry = updated.data ?? existing;
    } else if (!existing.is_paid) {
      const updated = await adminSupabase
        .from("revenue_expenses")
        .update({ is_paid: true })
        .eq("id", id)
        .eq("masjid_id", masjidId)
        .select()
        .single();
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
      entry = updated.data;
    } else {
      entry = existing;
    }
    error = null;
  }

  if (error || !entry) {
    const finalError = error as { message?: string } | null;
    return NextResponse.json(
      { error: finalError?.message ?? "Unable to settle expense" },
      { status: 400 }
    );
  }

  // Best-effort: generate PDF voucher and email it if contact has email
  void sendVoucherEmail(adminSupabase, masjidId, entry).catch(
    (err) => console.error("[Settle email]", err)
  );

  return NextResponse.json({ entry });
}

async function sendVoucherEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  masjidId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any
) {
  const [{ data: contact }, { data: masjid }] = await Promise.all([
    adminSupabase.from("contacts").select("name, email, phone").eq("id", entry.entity_id).maybeSingle(),
    adminSupabase.from("masjids").select("name, address, phone").eq("id", masjidId).maybeSingle(),
  ]);

  if (!contact?.email || !masjid) return;

  const pdfBytes = await generateReceiptPdf({
    receipt_number: entry.voucher_number,
    created_at: entry.created_at,
    amount: entry.amount,
    notes: entry.remarks,
    title: "EXPENSE VOUCHER",
    payeeLabel: "PAID TO",
    amountLabel: "AMOUNT PAID",
    payee: { name: contact.name, identifier: null, phone: contact.phone },
    masjid,
  });

  await sendEmail({
    to: contact.email,
    subject: `Payment voucher — ${entry.voucher_number}`,
    html: `<p>Dear ${contact.name},</p>
<p>A payment of <strong>₹${entry.amount}</strong> has been processed for you.</p>
<p>Voucher number: <strong>${entry.voucher_number}</strong></p>
${entry.remarks ? `<p>Remarks: ${entry.remarks}</p>` : ""}
<p>Please find the voucher PDF attached.</p>
<p>Regards,<br/>${masjid.name}</p>`,
    masjid_id: masjidId,
    attachment: {
      filename: `${entry.voucher_number}.pdf`,
      content: Buffer.from(pdfBytes),
    },
  });
}
