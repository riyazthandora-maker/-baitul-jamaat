"use client";

import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export default function EditableMemberName({
  memberId,
  initialName,
}: {
  memberId: string;
  initialName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      setName(trimmed);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Failed to save name. Please try again.");
    }
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  return (
    <div className="text-sm">
      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Full Name</dt>
      {editing ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="flex-1 border border-brand-green rounded-lg px-3 py-1.5 text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          />
          <button
            onClick={save}
            disabled={saving}
            className="p-1.5 rounded-lg bg-brand-green text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={cancel}
            className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <dd className="flex items-center gap-2 group">
          <span className="text-gray-800 font-medium">{name}</span>
          <button
            onClick={() => { setDraft(name); setEditing(true); }}
            className="opacity-40 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
            title="Edit name"
          >
            <Pencil className="w-3.5 h-3.5 text-brand-green" />
          </button>
          {saved && <span className="text-xs text-brand-green font-medium">Saved</span>}
        </dd>
      )}
    </div>
  );
}
