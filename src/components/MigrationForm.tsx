"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
  phone: string;
  opening_balance: number;
};

export default function MigrationForm({ members }: { members: Member[] }) {
  const [balances, setBalances] = useState<Record<string, string>>(
    Object.fromEntries(
      members.map((m) => [m.id, m.opening_balance > 0 ? String(m.opening_balance) : ""])
    )
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ saved: number; cleared: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setResult(null);

    const payload = members
      .filter((m) => balances[m.id] !== undefined)
      .map((m) => ({
        member_id: m.id,
        amount: parseFloat(balances[m.id] ?? "") || 0,
      }));

    const res = await fetch("/api/admin/migration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balances: payload }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      setResult({ saved: data.saved, cleared: data.cleared });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {members.length} active member{members.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Balances
        </button>
      </div>

      {result && (
        <div className="mx-4 sm:mx-5 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Saved {result.saved} opening balance{result.saved !== 1 ? "s" : ""}.
          {result.cleared > 0 && ` Cleared ${result.cleared}.`}
        </div>
      )}
      {error && (
        <div className="mx-4 sm:mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No active members yet.</div>
      ) : (
        <div className="divide-y">
          {/* Desktop header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_130px_160px] gap-4 px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50">
            <span>Member</span>
            <span>Phone</span>
            <span>Opening Balance (₹)</span>
          </div>

          {members.map((m) => (
            <div key={m.id} className="px-4 sm:px-5 py-3">
              {/* Mobile layout */}
              <div className="flex items-center gap-3 sm:hidden">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                  <p className="text-xs text-gray-400">{m.member_number ?? m.phone}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={balances[m.id] ?? ""}
                  onChange={(e) =>
                    setBalances((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_130px_160px] gap-4 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                  {m.member_number && (
                    <p className="text-xs font-mono text-brand-green">{m.member_number}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{m.phone}</p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={balances[m.id] ?? ""}
                  onChange={(e) =>
                    setBalances((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
