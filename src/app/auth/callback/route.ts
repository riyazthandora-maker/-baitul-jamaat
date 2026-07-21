import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const role = data.user.app_metadata?.role as string | undefined;
      const forceChange = !!data.user.app_metadata?.force_password_change;

      if (forceChange) {
        return NextResponse.redirect(new URL("/change-password", request.url));
      }
      if (role === "super_admin") {
        return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
      }
      if (role === "masjid_admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      if (role === "member") {
        return NextResponse.redirect(new URL("/member/dashboard", request.url));
      }
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}
