"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";

export default function VoidButton({
  endpoint,
  label = "Void",
}: {
  endpoint: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    const reason = prompt("Reason for voiding (required):");
    if (!reason?.trim()) return;
    setLoading(true);
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleVoid}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
      {label}
    </button>
  );
}
