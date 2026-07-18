"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, AlertTriangle, X } from "lucide-react";

interface ResetCredentials {
  memberNumber: string;
  name: string;
  password: string;
  emailSent: boolean;
}

export default function MemberResetPasswordButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ResetCredentials | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  async function handleReset() {
    if (
      !confirm(
        "Reset this member's password? A new temporary password will be generated and the member will be required to change it on next login."
      )
    )
      return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/members/${memberId}/reset-password`, {
        method: "POST",
      });
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

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }

  return (
    <>
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Shown once only.</strong> Copy and share these credentials securely. They will not be shown again.
              </p>
            </div>

            <h2 className="text-xl font-bold text-brand-green">
              Member Credentials — {credentials.name}
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Member ID
              </label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border px-4 py-3">
                <span className="font-mono text-base flex-1 select-all">
                  {credentials.memberNumber}
                </span>
                <button
                  onClick={() => copy(credentials.memberNumber, setCopiedId)}
                  className="text-brand-green hover:text-brand-green-dark flex-shrink-0"
                >
                  {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Temporary Password
              </label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border px-4 py-3">
                <span className="font-mono text-base flex-1 select-all tracking-wider">
                  {credentials.password}
                </span>
                <button
                  onClick={() => copy(credentials.password, setCopiedPw)}
                  className="text-brand-green hover:text-brand-green-dark flex-shrink-0"
                >
                  {copiedPw ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {credentials.emailSent && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Temporary password also emailed to the member.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  copy(
                    `Member ID: ${credentials.memberNumber}\nTemporary Password: ${credentials.password}\n\nPlease change your password on first login.`,
                    () => {}
                  );
                }}
                className="flex-1 bg-brand-green/10 text-brand-green rounded-lg py-3 text-sm font-medium hover:bg-brand-green/20 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy All
              </button>
              <button
                onClick={() => setCredentials(null)}
                className="flex-1 bg-brand-green text-white rounded-lg py-3 text-sm font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <KeyRound className="w-5 h-5 text-brand-green" />
          Member Account
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
          {loading ? "Resetting…" : "Reset Member Password"}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Generates a new temporary password shown once. The member must change it on next login.
        </p>
      </div>
    </>
  );
}
