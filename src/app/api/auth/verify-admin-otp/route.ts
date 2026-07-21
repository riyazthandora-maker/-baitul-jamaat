import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { parseOtpCtx, hashCode } from "@/lib/otp";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code: string = body.code ?? "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid 6-digit code." }, { status: 400 });
  }

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

  const { data: otp } = await adminClient
    .from("admin_otps")
    .select("id, code_hash, attempts")
    .eq("user_id", userId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
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
    return NextResponse.json(
      { error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
      { status: 400 }
    );
  }

  // Mark OTP used and clear cookie
  await adminClient.from("admin_otps").update({ used: true }).eq("id", otp.id);
  cookieStore.delete("otp_ctx");

  // Get the user's auth email alias
  const {
    data: { user },
  } = await adminClient.auth.admin.getUserById(userId);

  if (!user?.email) {
    return NextResponse.json({ error: "User not found." }, { status: 500 });
  }

  // Generate a one-time magic-link token so the client can establish the session
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token: linkData.properties.hashed_token,
    emailAlias: user.email,
  });
}
