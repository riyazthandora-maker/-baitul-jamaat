"use client";

import { useState, useTransition } from "react";
import { MoonStar, Eye, EyeOff } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
              <MoonStar className="w-8 h-8 text-brand-green" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-brand-green">Baitul Jamaat</h1>
          <p className="text-gray-500 text-sm">Masjid Membership System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
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

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
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
        </form>

        <p className="text-center text-xs text-gray-400">
          Forgot password? Contact your masjid admin.
        </p>
      </div>
    </div>
  );
}
