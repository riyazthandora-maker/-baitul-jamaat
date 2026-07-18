"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";

interface Props {
  applicationId: string;
}

export default function ApplicationActions({ applicationId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmReject, setConfirmReject] = useState(false);

  function handleReject() {
    startTransition(async () => {
      const res = await fetch(`/api/superadmin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  if (confirmReject) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-gray-500">Reject this request?</span>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "Yes, reject"}
        </button>
        <button
          onClick={() => setConfirmReject(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link
        href={`/superadmin/masjids/new?applicationId=${applicationId}`}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-green hover:text-brand-green-dark px-3 py-1.5 rounded-lg border border-brand-green/30 hover:bg-brand-green/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Masjid
      </Link>
      <button
        onClick={() => setConfirmReject(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Reject
      </button>
    </div>
  );
}
