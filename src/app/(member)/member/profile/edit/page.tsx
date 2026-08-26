"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";

interface MemberData {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  qualification: string | null;
  id_type: string | null;
  id_last4: string | null;
  photo_url: string | null;
}

interface PendingRequest {
  id: string;
  changes: Record<string, string>;
  new_photo_url: string | null;
  created_at: string;
  status: string;
  reject_reason: string | null;
}

const ID_TYPES = ["Aadhaar", "Passport", "PAN", "Voter ID", "Other"];
const QUALIFICATIONS = [
  "Below 10th Grade", "10th Grade", "12th Grade", "Diploma",
  "Graduate", "Post Graduate", "Doctorate", "House Wife", "Student", "Other",
];

export default function MemberEditProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [member, setMember] = useState<MemberData | null>(null);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    qualification: "",
    id_type: "",
    id_last4: "",
  });

  useEffect(() => {
    async function load() {
      const [memberRes, reqRes] = await Promise.all([
        fetch("/api/member/profile"),
        fetch("/api/member/profile/change-request"),
      ]);
      const memberData = await memberRes.json();
      const reqData = await reqRes.json();

      if (memberData.member) {
        const m: MemberData = memberData.member;
        setMember(m);
        setForm({
          full_name: m.full_name ?? "",
          phone: m.phone ?? "",
          email: m.email ?? "",
          qualification: m.qualification ?? "",
          id_type: m.id_type ?? "",
          id_last4: m.id_last4 ?? "",
        });
      }
      if (reqData.request) setPending(reqData.request);
      setLoading(false);
    }
    load();
  }, []);

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photoFile) fd.append("photo", photoFile);

    const res = await fetch("/api/member/profile/change-request", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to submit request");
    } else {
      setSuccess(true);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">Request Submitted</h2>
        <p className="text-gray-500 text-center">
          Your profile update has been sent to the admin for approval.
        </p>
        <Link
          href="/member/dashboard"
          className="px-6 py-3 rounded-lg bg-brand-green text-white font-semibold"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-4 px-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-12">

        {/* Pending request notice */}
        {pending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <Clock className="w-4 h-4" />
              Pending Change Request
            </div>
            <p className="text-sm text-amber-700">
              You submitted a change request on{" "}
              {new Date(pending.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}. It is waiting for admin approval.
            </p>
            {Object.keys(pending.changes).length > 0 && (
              <ul className="text-xs text-amber-700 space-y-1 mt-2">
                {Object.entries(pending.changes).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-medium capitalize">{k.replace(/_/g, " ")}</span>: {v || "—"}
                  </li>
                ))}
                {pending.new_photo_url && <li><span className="font-medium">Photo</span>: updated</li>}
              </ul>
            )}
            <p className="text-xs text-amber-600 mt-1">
              You cannot submit another request until this one is reviewed.
            </p>
          </div>
        )}

        {/* Last rejected notice */}
        {!pending && member && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Photo */}
              <div className="flex flex-col items-center gap-3 pb-2">
                <div
                  className="w-24 h-24 rounded-full bg-brand-green/10 border-2 border-brand-green/30 overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-brand-green">
                      {form.full_name.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-brand-green font-medium"
                >
                  Change Photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); }}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Full Name *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Qualification *</label>
                  <select
                    required
                    value={form.qualification}
                    onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
                  >
                    <option value="">Select…</option>
                    {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">ID Type</label>
                    <select
                      value={form.id_type}
                      onChange={(e) => setForm((p) => ({ ...p, id_type: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
                    >
                      <option value="">Select…</option>
                      {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Last 4 Digits</label>
                    <input
                      maxLength={4}
                      value={form.id_last4}
                      onChange={(e) => setForm((p) => ({ ...p, id_last4: e.target.value.replace(/\D/g, "") }))}
                      placeholder="1234"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green font-mono"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-lg bg-brand-green text-white font-semibold text-sm hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Submitting…" : "Submit for Approval"}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Changes will be applied after admin approval.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
