"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    console.log("[callback]", msg);
    setLog((prev) => [...prev, msg]);
  }

  useEffect(() => {
    async function run() {
      addLog("Page loaded");

      const hash = window.location.hash;
      const search = window.location.search;
      addLog(`hash: ${hash.slice(0, 80) || "(empty)"}`);
      addLog(`search: ${search || "(empty)"}`);

      const hashParams = new URLSearchParams(hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      addLog(`access_token found: ${!!access_token}`);
      addLog(`refresh_token found: ${!!refresh_token}`);

      const supabase = createClient();

      if (access_token && refresh_token) {
        addLog("Calling setSession...");
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          addLog(`setSession ERROR: ${error.message}`);
          setTimeout(() => { window.location.href = "/login?error=auth_failed"; }, 3000);
          return;
        }
        addLog(`setSession OK — role: ${data.session?.user?.app_metadata?.role}`);
        const role = data.session?.user?.app_metadata?.role as string | undefined;
        const forceChange = !!data.session?.user?.app_metadata?.force_password_change;
        const dest = forceChange ? "/change-password"
          : role === "super_admin" ? "/superadmin/dashboard"
          : role === "masjid_admin" ? "/admin/dashboard"
          : "/login";
        addLog(`Navigating to: ${dest}`);
        window.location.href = dest;
        return;
      }

      const code = new URLSearchParams(search).get("code");
      addLog(`PKCE code found: ${!!code}`);
      if (code) {
        addLog("Calling exchangeCodeForSession...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          addLog(`exchangeCodeForSession ERROR: ${error.message}`);
          setTimeout(() => { window.location.href = "/login?error=auth_failed"; }, 3000);
          return;
        }
        addLog(`exchangeCodeForSession OK — role: ${data.session?.user?.app_metadata?.role}`);
        const role = data.session?.user?.app_metadata?.role as string | undefined;
        const forceChange = !!data.session?.user?.app_metadata?.force_password_change;
        const dest = forceChange ? "/change-password"
          : role === "super_admin" ? "/superadmin/dashboard"
          : role === "masjid_admin" ? "/admin/dashboard"
          : "/login";
        addLog(`Navigating to: ${dest}`);
        window.location.href = dest;
        return;
      }

      addLog("No tokens or code found — redirecting to login");
      setTimeout(() => { window.location.href = "/login?error=auth_failed"; }, 3000);
    }

    run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono p-6">
      <p className="text-white text-lg mb-4">Auth Callback Debug</p>
      {log.map((line, i) => (
        <p key={i} className="text-sm">▶ {line}</p>
      ))}
    </div>
  );
}
