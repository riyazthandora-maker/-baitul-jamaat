"use client";

import { useState, useTransition } from "react";
import { MoonStar, Eye, EyeOff, User, Phone } from "lucide-react";
import { loginAction, memberLoginAction } from "./actions";

type Tab = "member" | "staff";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("member");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = tab === "member"
        ? await memberLoginAction(formData)
        : await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setShowPassword(false);
  }

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="pt-8 pb-6 px-6 sm:px-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
              <MoonStar className="w-8 h-8 text-brand-green" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-brand-green">Baitul Jamaat</h1>
          <p className="text-gray-500 text-sm">Masjid Membership System</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mx-6 sm:mx-8">
          <button
            type="button"
            onClick={() => switchTab("member")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "member"
                ? "border-brand-green text-brand-green"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <User className="w-4 h-4" />
            Member
          </button>
          <button
            type="button"
            onClick={() => switchTab("staff")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "staff"
                ? "border-brand-green text-brand-green"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Phone className="w-4 h-4" />
            Staff / Admin
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 pt-6 pb-8 space-y-5">
          {tab === "member" ? (
            <div className="space-y-2">
              <label htmlFor="member_id" className="block text-sm font-medium text-gray-700">
                Member ID
              </label>
              <input
                id="member_id"
                name="member_id"
                type="text"
                autoComplete="username"
                required
                placeholder="e.g. M-BJM-0042"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent font-mono uppercase"
                style={{ textTransform: "uppercase" }}
              />
              <p className="text-xs text-gray-400">
                Your member ID was sent to you when your account was approved.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

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
            {isPending ? "Logging in…" : "Log In"}
          </button>

          <p className="text-center text-xs text-gray-400">
            {tab === "member"
              ? "Forgot password? Contact your masjid admin."
              : "Forgot password? Contact your masjid admin."}
          </p>

          <div className="text-center pt-1">
            <a
              href="/guide"
              className="inline-flex items-center gap-1.5 text-xs text-brand-green hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              ഉപയോക്തൃ ഗൈഡ് കാണുക (User Guide)
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
