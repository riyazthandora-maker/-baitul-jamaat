"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

export default function ProgramActions({
  programId,
  active,
}: {
  programId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle() {
    setLoading("toggle");
    await fetch(`/api/admin/programs/${programId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
    setLoading(null);
  }

  async function remove() {
    if (!confirm("Delete this program? This cannot be undone.")) return;
    setLoading("delete");
    await fetch(`/api/admin/programs/${programId}`, { method: "DELETE" });
    router.push("/admin/programs");
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={toggle}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading === "toggle" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : active ? (
          <ToggleRight className="w-4 h-4 text-brand-green" />
        ) : (
          <ToggleLeft className="w-4 h-4 text-gray-400" />
        )}
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={remove}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {loading === "delete" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        Delete
      </button>
    </div>
  );
}
