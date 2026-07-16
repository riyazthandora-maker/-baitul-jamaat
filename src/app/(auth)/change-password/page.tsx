"use client";

import { useState, useTransition } from "react";
import { MoonStar, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const newPwd = fd.get("new_password") as string;
    const confirmPwd = fd.get("confirm_password") as string;

    if (newPwd.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPwd,
        data: { force_password_change: false },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Also clear the app_metadata flag via API route
      await fetch("/api/auth/clear-force-change", { method: "POST" });

      const { data } = await supabase.auth.getUser();
      const role = data.user?.app_metadata?.role;
      if (role === "super_admin") router.push("/superadmin/dashboard");
      else if (role === "masjid_admin") router.push("/admin/dashboard");
      else router.push("/member/dashboard");
    });
  }

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
              <MoonStar className="w-8 h-8 text-brand-green" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-brand-green">
            Set New Password
          </h1>
          <p className="text-gray-500 text-sm">
            For your security, please set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { id: "new_password", label: "New Password", show: showNew, toggle: () => setShowNew(!showNew) },
            { id: "confirm_password", label: "Confirm Password", show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
          ].map(({ id, label, show, toggle }) => (
            <div key={id} className="space-y-2">
              <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <div className="relative">
                <input
                  id={id}
                  name={id}
                  type={show ? "text" : "password"}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-0"
                >
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand-green text-white rounded-lg py-3 text-base font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60"
          >
            {isPending ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
