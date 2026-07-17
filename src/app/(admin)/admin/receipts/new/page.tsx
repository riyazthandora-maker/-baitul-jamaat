"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Member = { id: string; full_name: string; member_number: string | null; phone: string };

export default function NewReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("member_id") ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ member_id: preselect, amount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/members?status=active")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to record payment");
      setSaving(false);
    } else {
      router.push("/admin/receipts");
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/receipts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">Record Cash Payment</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
          <select
            required
            value={form.member_id}
            onChange={(e) => set("member_id", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="">— Select member —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} {m.member_number ? `(${m.member_number})` : `· ${m.phone}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="500.00"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input
            type="text"
            placeholder="e.g. July payment"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-green text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Record Payment & Generate Receipt"}
        </button>
      </form>
    </div>
  );
}
