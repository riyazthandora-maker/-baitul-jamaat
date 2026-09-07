"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  Pencil,
  X,
  Plus,
  UserCheck,
  UserX,
  BookUser,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact;
  onClose: () => void;
  onSaved: (c: Contact) => void;
}) {
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to update contact");
      setSaving(false);
      return;
    }
    onSaved(data.contact);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Edit Contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="optional"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Row ──────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onEdit,
  onToggleActive,
}: {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onToggleActive: (c: Contact) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setToggling(true);
    setConfirming(false);
    const res = await fetch(`/api/admin/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !contact.is_active }),
    });
    const data = await res.json();
    setToggling(false);
    if (res.ok) onToggleActive(data.contact);
  }

  return (
    <div
      className={`px-4 py-4 sm:px-5 flex items-start gap-3 ${
        !contact.is_active ? "opacity-50" : ""
      }`}
    >
      {/* Avatar initial */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-semibold text-sm">
        {contact.name.charAt(0).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{contact.name}</span>
          {!contact.is_active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 space-x-2">
          {contact.email && <span>{contact.email}</span>}
          {contact.email && contact.phone && <span>·</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {!contact.email && !contact.phone && (
            <span className="italic">No contact details</span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(contact)}
          title="Edit contact"
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-green hover:bg-brand-green/5 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">
              {contact.is_active ? "Deactivate?" : "Activate?"}
            </span>
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                contact.is_active
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            title={contact.is_active ? "Deactivate" : "Activate"}
            className={`p-1.5 rounded-lg transition-colors ${
              contact.is_active
                ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                : "text-gray-400 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : contact.is_active ? (
              <UserX className="w-3.5 h-3.5" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Contact Modal ─────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Contact) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create contact");
      setSaving(false);
      return;
    }
    onCreated(data.contact);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">New Contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="Vendor / company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="optional"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async (q: string, includeInactive: boolean) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (includeInactive) params.set("include_inactive", "true");
    const res = await fetch(`/api/admin/contacts?${params.toString()}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, showInactive), 250);
    return () => clearTimeout(t);
  }, [search, showInactive, load]);

  function handleSaved(updated: Contact) {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditTarget(null);
  }

  function handleToggleActive(updated: Contact) {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleCreated(contact: Contact) {
    setContacts((prev) =>
      [...prev, contact].sort((a, b) => a.name.localeCompare(b.name))
    );
    setCreateOpen(false);
  }

  const activeCount   = contacts.filter((c) => c.is_active).length;
  const inactiveCount = contacts.filter((c) => !c.is_active).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-green">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            External vendors and individuals used in finance entries
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New contact
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-brand-green focus:ring-brand-green"
          />
          Show inactive
          {inactiveCount > 0 && (
            <span className="text-xs text-gray-400">({inactiveCount})</span>
          )}
        </label>
      </div>

      {/* Modals */}
      {editTarget && (
        <EditModal
          contact={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
      {createOpen && (
        <CreateModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <BookUser className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">
              {search ? "No contacts match your search" : "No contacts yet"}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-3 text-sm text-brand-green hover:underline"
              >
                Create your first contact
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onEdit={setEditTarget}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
