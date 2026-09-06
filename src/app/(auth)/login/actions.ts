"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { signOtpCtx, generateOtp, maskEmail, otpEmailHtml } from "@/lib/otp";
import { sendEmail } from "@/lib/email";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAdminEmail(role: string, masjidId: string | null): Promise<string | null> {
  if (role === "super_admin") {
    return process.env.SUPER_ADMIN_EMAIL ?? null;
  }
  if (role === "masjid_admin" && masjidId) {
    const adminClient = await createAdminClient();
    const { data } = await adminClient
      .from("masjids")
      .select("contact_email")
      .eq("id", masjidId)
      .maybeSingle();
    return (data as { contact_email?: string | null } | null)?.contact_email ?? null;
  }
  return null;
}

async function initiateOtp(
  userId: string,
  email: string
): Promise<void> {
  const adminClient = await createAdminClient();
  const { code, codeHash } = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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

  const ctxExpiry = Date.now() + 15 * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set("otp_ctx", signOtpCtx(userId, ctxExpiry), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60,
    path: "/",
  });
}

type LoginResult =
  | { error: string }
  | { redirect: string }
  | { step: "otp"; maskedEmail: string };

// ── Staff / Admin login ───────────────────────────────────────────────────────

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "Phone number and password are required." };
  }

  const supabase = await createClient();

  // Supabase Auth uses email field — we store phone as the "email" identifier
  // Normalize: strip all non-digit characters so +447911123456 and 447911123456 produce the same alias
  const emailAlias = `${phone.replace(/\D/g, "")}@bj.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailAlias,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid phone number or password." };
  }

  const { id: userId, app_metadata } = data.user;
  const role = app_metadata?.role as string | undefined;
  const forceChange = !!app_metadata?.force_password_change;
  const masjidId = app_metadata?.masjid_id ?? null;

  // Members: no OTP — proceed directly
  if (role === "member") {
    if (forceChange) return { redirect: "/change-password" };
    return { redirect: "/member/dashboard" };
  }

  // Admins: sign out immediately, then run OTP flow
  if (role === "super_admin" || role === "masjid_admin") {
    await supabase.auth.signOut();

    const email = await getAdminEmail(role, masjidId);

    if (!email) {
      // No email configured — dev fallback: re-sign in and skip OTP
      console.warn(`[OTP] No email configured for ${role} (userId=${userId}). Skipping OTP.`);
      const { data: reData } = await supabase.auth.signInWithPassword({ email: emailAlias, password });
      if (!reData?.user) return { error: "Login failed. Please try again." };
      if (forceChange) return { redirect: "/change-password" };
      if (role === "super_admin") return { redirect: "/superadmin/dashboard" };
      return { redirect: "/admin/dashboard" };
    }

    await initiateOtp(userId, email);

    return {
      step: "otp" as const,
      maskedEmail: maskEmail(email),
    };
  }

  return { redirect: "/login" };
}

// ── Member login ──────────────────────────────────────────────────────────────

export async function memberLoginAction(formData: FormData): Promise<{ error: string } | { redirect: string }> {
  const memberId = (formData.get("member_id") as string)?.trim().toUpperCase();
  const password = formData.get("password") as string;

  if (!memberId || !password) {
    return { error: "Member ID and password are required." };
  }

  const adminSupabase = await createAdminClient();
  const { data: member } = await adminSupabase
    .from("members")
    .select("id, profile_id, status")
    .eq("member_number", memberId)
    .maybeSingle();

  if (!member?.profile_id || member.status !== "active") {
    return { error: "Invalid Member ID or password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${member.id}@bj.local`,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid Member ID or password." };
  }

  if (data.user.app_metadata?.force_password_change) {
    return { redirect: "/change-password" };
  }

  return { redirect: "/member/dashboard" };
}
