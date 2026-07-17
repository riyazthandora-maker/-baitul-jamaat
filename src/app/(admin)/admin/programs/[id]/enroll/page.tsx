"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, CheckSquare, Square } from "lucide-react";
import Link from "next/link";

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
  phone: string;
  gender: string | null;
  qualification: string | null;
};

type EnrollRow = { member_id: string; amount: string };

export default function EnrollPage() {
  const { id: programId } = useParams<{ id: string }>();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, EnrollRow>>(new Map());
  const [defaultAmount, setDefaultAmount] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/members?status=active")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
    fetch(`/api/admin/programs/${programId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.program) setDefaultAmount(String(d.program.default_amount));
      });
  }, [programId]);

  const filtered = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      (m.member_number ?? "").includes(search)
  );

  function toggle(member: Member) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(member.id)) {
        next.delete(member.id);
      } else {
        next.set(member.id, { member_id: member.id, amount: defaultAmount });
      }
      return next;
    });
  }

  function selectAll() {
    const next = new Map<string, EnrollRow>();
    filtered.forEach((m) => next.set(m.id, { member_id: m.id, amount: defaultAmount }));
    setSelected(next);
  }

  function updateAmount(memberId: string, amount: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      const row = next.get(memberId);
      if (row) next.set(memberId, { ...row, amount });
      return next;
    });
  }

  async function handleEnroll() {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);

    const enrollments = Array.from(selected.values()).map((e) => ({
      member_id: e.member_id,
      amount: parseFloat(e.amount) || 0,
    }));

    const res = await fetch(`/api/admin/programs/${programId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollments }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to enroll");
      setSaving(false);
    } else {
      router.push(`/admin/programs/${programId}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/admin/programs/${programId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-brand-green">Enroll Members</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone or member number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="text-sm text-brand-green underline whitespace-nowrap"
          >
            Select all
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y">
          {filtered.map((m) => {
            const row = selected.get(m.id);
            const isSelected = !!row;
            return (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  className="flex-shrink-0 text-brand-green"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name}</p>
                  <p className="text-xs text-gray-400">{m.member_number ?? m.phone}</p>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm text-gray-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row!.amount}
                      onChange={(e) => updateAmount(m.id, e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <p className="text-sm text-gray-400 text-center py-6">No active members found</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={handleEnroll}
        disabled={saving || selected.size === 0}
        className="w-full bg-brand-green text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : (
          `Enroll ${selected.size} Member${selected.size !== 1 ? "s" : ""}`
        )}
      </button>
    </div>
  );
}
