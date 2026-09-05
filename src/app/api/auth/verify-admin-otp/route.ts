import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { parseOtpCtx, hashCode } from "@/lib/otp";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code: string = body.code ?? "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid 6-digit code." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const ctx = cookieStore.get("otp_ctx")?.value;

  if (!ctx) {
    console.error("[verify-otp] otp_ctx cookie missing");
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  const parsed = parseOtpCtx(ctx);
  if (!parsed) {
    console.error("[verify-otp] parseOtpCtx failed — cookie invalid or expired");
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  const { userId } = parsed;
  const adminClient = await createAdminClient();

  const { data: otp, error: otpErr } = await adminClient
    .from("admin_otps")
    .select("id, code_hash, attempts")
    .eq("user_id", userId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr) {
    console.error("[verify-otp] DB query error:", otpErr.message);
  }

  if (!otp) {
    console.error("[verify-otp] No valid OTP found for userId:", userId);
    return NextResponse.json(
      { error: "Code has expired. Please log in again." },
      { status: 401 }
    );
  }

  if (otp.attempts >= 5) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please log in again." },
      { status: 429 }
    );
  }

  if (hashCode(code) !== otp.code_hash) {
    await adminClient
      .from("admin_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);

    const remaining = 4 - otp.attempts;
    console.error(`[verify-otp] Code mismatch for userId: ${userId}, attempts now: ${otp.attempts + 1}`);
    return NextResponse.json(
      { error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
      { status: 400 }
    );
  }

  // OTP accepted — mark used and clear cookie
  await adminClient.from("admin_otps").update({ used: true }).eq("id", otp.id);
  cookieStore.delete("otp_ctx");

  // Get user details
  const {
    data: { user },
    error: userErr,
  } = await adminClient.auth.admin.getUserById(userId);

  if (userErr || !user?.email) {
    console.error("[verify-otp] getUserById failed:", userErr?.message);
    return NextResponse.json({ error: "User not found." }, { status: 500 });
  }

  // Generate a magic link — the client will navigate to this URL; Supabase
  // redirects to /auth/callback with the session tokens in the URL hash,
  // and the client-side callback page calls setSession() to persist them.
  const appUrl = getAppUrl(request.nextUrl.origin);

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[verify-otp] generateLink failed:", linkError?.message);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }

  // Supabase can use its configured Site URL when building the action link.
  // Override that value so a stale localhost setting cannot redirect production users.
  const actionUrl = new URL(linkData.properties.action_link);
  actionUrl.searchParams.set("redirect_to", `${appUrl}/auth/callback`);

  return NextResponse.json({ actionLink: actionUrl.toString() });
}
