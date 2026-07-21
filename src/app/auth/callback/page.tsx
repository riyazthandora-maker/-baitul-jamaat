"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient();

    function navigate(user: { app_metadata?: Record<string, unknown> }) {
      const role = user.app_metadata?.role as string | undefined;
      if (user.app_metadata?.force_password_change) {
        window.location.href = "/change-password";
        return;
      }
      if (role === "super_admin") { window.location.href = "/superadmin/dashboard"; return; }
      if (role === "masjid_admin") { window.location.href = "/admin/dashboard"; return; }
      window.location.href = "/login";
    }

    // Supabase redirects here with tokens in the URL hash (implicit flow):
    // /auth/callback#access_token=xxx&refresh_token=xxx&...
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (error || !data.session) {
          console.error("[callback] setSession failed:", error?.message);
          window.location.href = "/login?error=auth_failed";
          return;
        }
        navigate(data.session.user);
      });
      return;
    }

    // Fallback: PKCE ?code= flow
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          console.error("[callback] exchangeCodeForSession failed:", error?.message);
          window.location.href = "/login?error=auth_failed";
          return;
        }
        navigate(data.session.user);
      });
      return;
    }

    window.location.href = "/login?error=auth_failed";
  }, []);

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center">
      <p className="text-white text-lg">Signing you in…</p>
    </div>
  );
}
