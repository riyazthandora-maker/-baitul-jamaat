import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { receiptSchema } from "@/lib/validators/receipt";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = request.nextUrl.searchParams.get("member_id");
  let query = supabase
    .from("receipts")
    .select("*, members(full_name, member_number, phone, email)")
    .order("created_at", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ receipts: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = receiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Generate receipt number atomically
  const { data: receiptNum, error: numErr } = await adminSupabase.rpc(
    "next_receipt_number",
    { p_masjid_id: masjidId }
  );
  if (numErr || !receiptNum) {
    return NextResponse.json({ error: "Failed to generate receipt number" }, { status: 500 });
  }

  // Create receipt
  const { data: receipt, error: recErr } = await adminSupabase
    .from("receipts")
    .insert({
      masjid_id: masjidId,
      member_id: parsed.data.member_id,
      receipt_number: receiptNum,
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (recErr || !receipt) {
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 });
  }

  // Create payment ledger entry
  await adminSupabase.from("ledger").insert({
    masjid_id: masjidId,
    member_id: parsed.data.member_id,
    receipt_id: receipt.id,
    type: "payment",
    amount: parsed.data.amount,
    description: `Payment — ${receiptNum}`,
  });

  // Audit log
  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "receipts",
    record_id: receipt.id,
    action: "insert",
    after_data: receipt,
  });

  // Email member if they have an email
  const { data: member } = await adminSupabase
    .from("members")
    .select("full_name, email")
    .eq("id", parsed.data.member_id)
    .maybeSingle();

  if (member?.email) {
    const { data: masjid } = await adminSupabase
      .from("masjids")
      .select("name")
      .eq("id", masjidId)
      .maybeSingle();

    await sendEmail({
      to: member.email,
      subject: `Payment received — ${receiptNum}`,
      html: `<p>Dear ${member.full_name},</p>
<p>Your payment of <strong>₹${parsed.data.amount}</strong> has been recorded.</p>
<p>Receipt number: <strong>${receiptNum}</strong></p>
<p>Thank you,<br/>${masjid?.name ?? "Baitul Jamaat"}</p>`,
      masjid_id: masjidId,
    });
  }

  return NextResponse.json({ receipt }, { status: 201 });
}
