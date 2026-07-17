import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { donationSchema } from "@/lib/validators/donation";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donations: data });
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
  const parsed = donationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Generate receipt number from the shared masjid sequence
  const { data: receiptNum, error: numErr } = await adminSupabase.rpc(
    "next_receipt_number",
    { p_masjid_id: masjidId }
  );
  if (numErr || !receiptNum) {
    return NextResponse.json({ error: "Failed to generate receipt number" }, { status: 500 });
  }

  const { data: donation, error: insErr } = await adminSupabase
    .from("donations")
    .insert({
      masjid_id: masjidId,
      donor_name: parsed.data.donor_name,
      donor_phone: parsed.data.donor_phone ?? null,
      donor_email: parsed.data.donor_email || null,
      amount: parsed.data.amount,
      purpose: parsed.data.purpose ?? null,
      receipt_number: receiptNum,
    })
    .select()
    .single();

  if (insErr || !donation) {
    return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
  }

  // Audit log
  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "donations",
    record_id: donation.id,
    action: "insert",
    after_data: donation,
  });

  // Email donor if they provided an email
  if (donation.donor_email) {
    const { data: masjid } = await adminSupabase
      .from("masjids")
      .select("name")
      .eq("id", masjidId)
      .maybeSingle();

    await sendEmail({
      to: donation.donor_email,
      subject: `Donation receipt — ${receiptNum}`,
      html: `<p>Dear ${donation.donor_name},</p>
<p>Thank you for your generous donation of <strong>₹${donation.amount}</strong>${donation.purpose ? ` for <em>${donation.purpose}</em>` : ""}.</p>
<p>Receipt number: <strong>${receiptNum}</strong></p>
<p>May Allah accept your contribution.</p>
<p>${masjid?.name ?? "Baitul Jamaat"}</p>`,
      masjid_id: masjidId,
    });
  }

  return NextResponse.json({ donation }, { status: 201 });
}
