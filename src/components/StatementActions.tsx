"use client";

import { useState } from "react";
import { Download, Mail, Loader2, CheckCircle } from "lucide-react";

export default function StatementActions({
  downloadUrl,
  emailUrl,
  memberEmail,
  emailConfigured,
  defaultMonth,
}: {
  downloadUrl: string;
  emailUrl: string;
  memberEmail: string | null | undefined;
  emailConfigured: boolean;
  defaultMonth: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const canEmail = emailConfigured && Boolean(memberEmail);
  const disabledReason = !emailConfigured
    ? "Email is not configured"
    : !memberEmail
      ? "No email on file"
      : null;

  function handleMonthChange(value: string) {
    setMonth(value || defaultMonth);
    setEmailStatus("idle");
    setEmailError(null);
  }

  async function handleEmail() {
    if (!canEmail || emailing) return;

    setEmailing(true);
    setEmailStatus("idle");
    setEmailError(null);

    try {
      const res = await fetch(
        `${emailUrl}?month=${encodeURIComponent(month)}`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.ok) {
        setEmailStatus("sent");
      } else {
        setEmailStatus("error");
        setEmailError(data.error ?? "Failed to send");
      }
    } catch {
      setEmailStatus("error");
      setEmailError("Could not reach the server");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="sr-only">Statement month</span>
          <input
            type="month"
            value={month}
            max={defaultMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </label>

        <a
          href={`${downloadUrl}?month=${encodeURIComponent(month)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm border border-brand-green text-brand-green px-3 py-1.5 rounded-lg hover:bg-brand-green/5 transition-colors"
        >
          <Download className="w-4 h-4" /> Download PDF
        </a>

        <button
          type="button"
          onClick={handleEmail}
          disabled={!canEmail || emailing || emailStatus === "sent"}
          title={disabledReason ?? "Email this statement to the member"}
          className="flex items-center gap-1.5 text-sm border border-brand-gold text-brand-gold px-3 py-1.5 rounded-lg hover:bg-brand-gold/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {emailing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </>
          ) : emailStatus === "sent" ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Sent</span>
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" /> Email Statement
            </>
          )}
        </button>
      </div>

      {disabledReason && (
        <p className="text-xs text-gray-400">{disabledReason}</p>
      )}

      {emailStatus === "error" && emailError && (
        <p className="text-xs text-red-600">{emailError}</p>
      )}
    </div>
  );
}
