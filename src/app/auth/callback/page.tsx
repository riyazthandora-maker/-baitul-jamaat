"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function run() {
      const supabase = createClient();

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error || !data.session) {
          window.location.href = "/login?error=auth_failed";
          return;
        }
        const role = data.session.user.app_metadata?.role as string | undefined;
        if (data.session.user.app_metadata?.force_password_change) {
          window.location.href = "/change-password";
        } else if (role === "super_admin") {
          window.location.href = "/superadmin/dashboard";
        } else if (role === "masjid_admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/login";
        }
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          window.location.href = "/login?error=auth_failed";
          return;
        }
        const role = data.session.user.app_metadata?.role as string | undefined;
        if (data.session.user.app_metadata?.force_password_change) {
          window.location.href = "/change-password";
        } else if (role === "super_admin") {
          window.location.href = "/superadmin/dashboard";
        } else if (role === "masjid_admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/login";
        }
        return;
      }

      window.location.href = "/login?error=auth_failed";
    }

    run();
  }, []);

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center">
      <p className="text-white text-lg">Signing you in…</p>
    </div>
  );
}
