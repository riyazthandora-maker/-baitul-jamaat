"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX, Loader2 } from "lucide-react";

export default function MemberStatusToggle({
  memberId,
  currentStatus,
}: {
  memberId: string;
  currentStatus: "active" | "inactive";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (
      !confirm(
        currentStatus === "active"
          ? "Deactivate this member? They will be excluded from new transactions."
          : "Reactivate this member?"
      )
    )
      return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
          currentStatus === "active"
            ? "border border-red-200 text-red-600 hover:bg-red-50"
            : "border border-green-200 text-green-700 hover:bg-green-50"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : currentStatus === "active" ? (
          <UserX className="w-4 h-4" />
        ) : (
          <UserCheck className="w-4 h-4" />
        )}
        {currentStatus === "active" ? "Deactivate Member" : "Reactivate Member"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
