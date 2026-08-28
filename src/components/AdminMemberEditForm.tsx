"use client";

import { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import { ID_TYPE_OPTIONS, normalizeIdType } from "@/lib/member-types";

interface Props {
  memberId: string;
  member: {
    full_name: string;
    phone: string;
    email: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    qualification: string | null;
    id_type: string | null;
    id_last4: string | null;
  };
}

const QUALIFICATIONS = [
  "Below 10th Grade", "10th Grade", "12th Grade", "Diploma",
  "Graduate", "Post Graduate", "Doctorate", "House Wife", "Student", "Other",
];

export default function AdminMemberEditForm({ memberId, member }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: member.full_name ?? "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    dob: member.dob ?? "",
    gender: member.gender ?? "",
    address: member.address ?? "",
    qualification: member.qualification ?? "",
    id_type: normalizeIdType(member.id_type),
    id_last4: member.id_last4 ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  // Preserve any stored ID type that isn't one of the standard options
  const extraIdType =
    form.id_type && !ID_TYPE_OPTIONS.includes(form.id_type as (typeof ID_TYPE_OPTIONS)[number])
      ? form.id_type
      : null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/members/${memberId}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Save failed");
    } else {
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); window.location.reload(); }, 800);
    }
    setSaving(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-brand-green hover:text-green-800 font-medium"
      >
        {open ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        {open ? "Cancel" : "Edit Profile"}
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Full Name</label>
              <input value={form.full_name} onChange={set("full_name")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
              <input value={form.phone} onChange={set("phone")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={set("email")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</label>
              <input type="date" value={form.dob} onChange={set("dob")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Gender</label>
              <select value={form.gender} onChange={set("gender")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white">
                <option value="">Select…</option>
                {["Male", "Female", "Other"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Qualification</label>
              <select value={form.qualification} onChange={set("qualification")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white">
                <option value="">Select…</option>
                {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">ID Type</label>
              <select value={form.id_type} onChange={set("id_type")} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white">
                <option value="">Select…</option>
                {extraIdType && <option value={extraIdType}>{extraIdType}</option>}
                {ID_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">ID Last 4 Digits</label>
              <input maxLength={4} value={form.id_last4} onChange={(e) => setForm((p) => ({ ...p, id_last4: e.target.value.replace(/\D/g, "") }))} placeholder="1234" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green font-mono" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Address</label>
            <textarea value={form.address} onChange={set("address")} rows={2} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none" />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-green text-white text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved</> : saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
