"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    function handleUser(user: { app_metadata?: Record<string, unknown> }) {
      const role = user.app_metadata?.role as string | undefined;
      if (user.app_metadata?.force_password_change) {
        router.replace("/change-password");
        return;
      }
      if (role === "super_admin") { router.replace("/superadmin/dashboard"); return; }
      if (role === "masjid_admin") { router.replace("/admin/dashboard"); return; }
      router.replace("/login");
    }

    // Supabase redirects here with session tokens in the URL hash:
    // /auth/callback#access_token=xxx&refresh_token=xxx&...
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (error || !data.session) {
          console.error("[callback] setSession failed:", error?.message);
          router.replace("/login?error=auth_failed");
          return;
        }
        handleUser(data.session.user);
      });
      return;
    }

    // Fallback: PKCE ?code= flow (standard magic link emails)
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          console.error("[callback] exchangeCodeForSession failed:", error?.message);
          router.replace("/login?error=auth_failed");
          return;
        }
        handleUser(data.session.user);
      });
      return;
    }

    router.replace("/login?error=auth_failed");
  }, [router]);

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center">
      <p className="text-white text-lg">Signing you in…</p>
    </div>
  );
}
