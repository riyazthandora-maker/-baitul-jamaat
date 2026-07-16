"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Copy, MessageCircle } from "lucide-react";

type Credentials = {
  memberNumber: string;
  phone: string;
  password: string;
  name: string;
};

export default function ApproveRejectButtons({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copied, setCopied] = useState(false);

  async function approve() {
    setLoading("approve");
    const res = await fetch(`/api/admin/members/${memberId}/approve`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) {
      setCredentials(data.credentials);
    } else {
      alert(data.error ?? "Approval failed");
    }
  }

  async function reject() {
    setLoading("reject");
    await fetch(`/api/admin/members/${memberId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setLoading(null);
    router.push("/admin/members");
  }

  function copyCredentials() {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Member Number: ${credentials.memberNumber}\nPhone: ${credentials.phone}\nPassword: ${credentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function whatsappShare() {
    if (!credentials) return;
    const appUrl = window.location.origin;
    const msg = encodeURIComponent(
      `Assalamu Alaikum ${credentials.name},\n\nYour membership has been approved!\n\nMember Number: ${credentials.memberNumber}\nLogin Phone: ${credentials.phone}\nPassword: ${credentials.password}\n\nLogin at: ${appUrl}/login\n\nPlease change your password after first login.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  if (credentials) {
    return (
      <div className="bg-brand-green/5 border-2 border-brand-green rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-brand-green text-lg">
          Member Approved!
        </h3>
        <p className="text-sm text-gray-600">
          Share these credentials with <strong>{credentials.name}</strong>. They
          will be asked to change their password on first login.
        </p>

        <div className="bg-white rounded-lg p-4 font-mono text-sm space-y-2 border border-brand-green/20">
          <div>
            <span className="text-gray-400">Member Number:</span>{" "}
            <span className="font-bold text-brand-green">
              {credentials.memberNumber}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Phone:</span> {credentials.phone}
          </div>
          <div>
            <span className="text-gray-400">Password:</span>{" "}
            <span className="font-bold">{credentials.password}</span>
          </div>
        </div>

        <p className="text-xs text-red-500 font-medium">
          Save these now — this password will not be shown again.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={copyCredentials}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button
            onClick={whatsappShare}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Send via WhatsApp
          </button>
          <button
            onClick={() => router.push("/admin/members")}
            className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showReject ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-red-700">Reject Application</h3>
          <textarea
            rows={3}
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={reject}
              disabled={loading === "reject"}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading === "reject" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Confirm Reject
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={approve}
            disabled={!!loading}
            className="flex-1 bg-brand-green text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {loading === "approve" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            Approve
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={!!loading}
            className="flex-1 border-2 border-red-300 text-red-600 py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-60 transition-colors"
          >
            <X className="w-5 h-5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
