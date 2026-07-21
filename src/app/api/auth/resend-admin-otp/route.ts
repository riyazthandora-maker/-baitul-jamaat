import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { parseOtpCtx, generateOtp, maskEmail, otpEmailHtml } from "@/lib/otp";
import { sendEmail } from "@/lib/email";

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  const ctx = cookieStore.get("otp_ctx")?.value;
  if (!ctx) {
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  const parsed = parseOtpCtx(ctx);
  if (!parsed) {
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  const { userId } = parsed;
  const adminClient = await createAdminClient();

  // Rate limit: max 3 OTP rows per user in last 15 minutes
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from("admin_otps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait a few minutes and log in again." },
      { status: 429 }
    );
  }

  // Invalidate existing unused OTPs
  await adminClient
    .from("admin_otps")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("used", false);

  // Look up the admin's email
  const {
    data: { user },
  } = await adminClient.auth.admin.getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 500 });
  }

  const role = user.app_metadata?.role as string | undefined;
  const masjidId = user.app_metadata?.masjid_id ?? null;

  let email: string | null = null;
  if (role === "super_admin") {
    email = process.env.SUPER_ADMIN_EMAIL ?? null;
  } else if (masjidId) {
    const { data } = await adminClient
      .from("masjids")
      .select("contact_email")
      .eq("id", masjidId)
      .maybeSingle();
    email = (data as { contact_email?: string | null } | null)?.contact_email ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: "No email configured for this account." }, { status: 500 });
  }

  // Generate fresh OTP
  const { code, codeHash } = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await adminClient.from("admin_otps").insert({
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
  });

  await sendEmail({
    to: email,
    subject: "Your Baitul Jamaat Login Code",
    html: otpEmailHtml(code),
  });

  return NextResponse.json({ ok: true, maskedEmail: maskEmail(email) });
}
