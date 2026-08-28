"use client";

import { useState, useEffect } from "react";
import { Clock, Check, X } from "lucide-react";

interface ChangeRequest {
  id: string;
  changes: Record<string, string>;
  new_photo_url: string | null;
  created_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  phone: "Phone",
  email: "Email",
  qualification: "Qualification",
  job: "Job",
  id_type: "ID Type",
  id_last4: "ID Last 4",
};

export default function AdminChangeRequestReview({ memberId }: { memberId: string }) {
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/change-request`)
      .then((r) => r.json())
      .then((d) => { setRequest(d.request); setLoading(false); });
  }, [memberId]);

  const approve = async () => {
    setProcessing(true);
    await fetch(`/api/admin/members/${memberId}/change-request/approve`, { method: "POST" });
    setDone("approved");
    setProcessing(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const reject = async () => {
    setProcessing(true);
    await fetch(`/api/admin/members/${memberId}/change-request/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setDone("rejected");
    setProcessing(false);
    setTimeout(() => window.location.reload(), 800);
  };

  if (loading || !request) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-amber-800 font-semibold">
        <Clock className="w-4 h-4" />
        Pending Profile Change Request
        <span className="ml-auto text-xs font-normal text-amber-600">
          {new Date(request.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </div>

      <div className="space-y-2">
        {Object.entries(request.changes).map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 text-sm">
            <span className="text-xs text-amber-600 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">
              {FIELD_LABELS[k] ?? k}
            </span>
            <span className="text-amber-900 font-medium break-all">{v || "—"}</span>
          </div>
        ))}
        {request.new_photo_url && (
          <div className="flex items-start gap-3 text-sm">
            <span className="text-xs text-amber-600 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">Photo</span>
            <span className="text-amber-900 font-medium">New photo submitted</span>
          </div>
        )}
      </div>

      {done === "approved" && (
        <p className="text-green-700 font-medium text-sm flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Approved — profile updated
        </p>
      )}
      {done === "rejected" && (
        <p className="text-red-600 font-medium text-sm flex items-center gap-1.5">
          <X className="w-4 h-4" /> Rejected
        </p>
      )}

      {!done && (
        <div className="space-y-3">
          {showReject && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Reason (optional)</label>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incorrect information"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={approve}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
            {showReject ? (
              <button
                onClick={reject}
                disabled={processing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Confirm Reject
              </button>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
