"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import CredentialsModal from "@/components/CredentialsModal";

interface Credentials {
  phone: string;
  password: string;
  masjidName: string;
}

export default function ResetPasswordButton({ masjidId }: { masjidId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  async function handleReset() {
    if (
      !confirm(
        "Reset the admin password? A new temporary password will be generated and the admin will be required to change it on next login."
      )
    )
      return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/superadmin/masjids/${masjidId}/reset-admin-password`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to reset password");
        return;
      }

      setCredentials(data.credentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onDone={() => setCredentials(null)}
        />
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <KeyRound className="w-5 h-5 text-brand-green" />
          Admin Account
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={loading}
          className="bg-amber-500 text-white rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Resetting…" : "Reset Admin Password"}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Generates a new temporary password shown once. The admin must change it on next login.
        </p>
      </div>
    </>
  );
}
