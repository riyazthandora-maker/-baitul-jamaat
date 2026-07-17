"use client";

import { useState } from "react";
import { Download, Mail, Loader2, CheckCircle } from "lucide-react";

export default function StatementActions({
  memberId,
  memberEmail,
}: {
  memberId: string;
  memberEmail: string | null | undefined;
}) {
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleEmail() {
    setEmailing(true);
    setEmailStatus("idle");
    setEmailError(null);

    const res = await fetch(`/api/admin/members/${memberId}/statement/email`, {
      method: "POST",
    });
    const data = await res.json();
    setEmailing(false);

    if (res.ok) {
      setEmailStatus("sent");
    } else {
      setEmailStatus("error");
      setEmailError(data.error ?? "Failed to send");
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`/api/admin/members/${memberId}/statement`}
        target="_blank"
        className="flex items-center gap-1.5 text-sm border border-brand-green text-brand-green px-3 py-1.5 rounded-lg hover:bg-brand-green/5 transition-colors"
      >
        <Download className="w-4 h-4" /> Download Statement
      </a>

      {memberEmail && (
        <button
          onClick={handleEmail}
          disabled={emailing || emailStatus === "sent"}
          className="flex items-center gap-1.5 text-sm border border-brand-gold text-brand-gold px-3 py-1.5 rounded-lg hover:bg-brand-gold/5 disabled:opacity-60 transition-colors"
        >
          {emailing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
          ) : emailStatus === "sent" ? (
            <><CheckCircle className="w-4 h-4 text-green-600" /> <span className="text-green-600">Sent</span></>
          ) : (
            <><Mail className="w-4 h-4" /> Email Statement</>
          )}
        </button>
      )}

      {emailStatus === "error" && emailError && (
        <span className="text-xs text-red-600">{emailError}</span>
      )}
    </div>
  );
}
