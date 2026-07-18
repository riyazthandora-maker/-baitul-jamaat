"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function OpeningBalanceForm({
  memberId,
  currentBalance,
}: {
  memberId: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(currentBalance > 0 ? String(currentBalance) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/members/${memberId}/opening-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setSaving(false);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <DatabaseZap className="w-4 h-4 text-brand-green" />
          Opening Balance (Migration)
          {currentBalance > 0 && (
            <span className="text-xs font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
              ₹{currentBalance.toFixed(2)} set
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t">
          <p className="text-xs text-gray-500 pt-3">
            Set the balance this member owed before the system was set up. Enter 0 to clear.
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <DatabaseZap className="w-3 h-3" />}
              Save
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
