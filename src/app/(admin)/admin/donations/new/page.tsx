"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Heart } from "lucide-react";
import Link from "next/link";

export default function NewDonationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    donor_name: "",
    donor_phone: "",
    donor_email: "",
    amount: "",
    purpose: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        donor_phone: form.donor_phone || null,
        donor_email: form.donor_email || null,
        purpose: form.purpose || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to record donation");
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
        <h1 className="text-2xl font-bold text-brand-green">Record Donation</h1>
      </div>

      <p className="text-sm text-gray-500">
        For walk-in donors or one-time contributions — no membership required.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Donor Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            placeholder="Full name of donor"
            value={form.donor_name}
            onChange={(e) => set("donor_name", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              placeholder="Mobile number"
              value={form.donor_phone}
              onChange={(e) => set("donor_phone", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              placeholder="For receipt email"
              value={form.donor_email}
              onChange={(e) => set("donor_email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="500"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose (optional)</label>
            <input
              type="text"
              placeholder="e.g. Masjid renovation"
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-gold text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><Heart className="w-4 h-4" /> Record Donation & Generate Receipt</>
          )}
        </button>
      </form>
    </div>
  );
}
