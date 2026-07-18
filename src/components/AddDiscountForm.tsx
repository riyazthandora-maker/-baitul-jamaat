"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function AddDiscountForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        amount: parseFloat(form.amount),
        description: form.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to add discount");
      setSaving(false);
    } else {
      setForm({ amount: "", description: "" });
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
          <Tag className="w-4 h-4 text-brand-green" /> Add Discount
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="100"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason *</label>
              <input
                required
                type="text"
                placeholder="e.g. Hardship waiver"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
            Apply Discount
          </button>
        </form>
      )}
    </div>
  );
}
