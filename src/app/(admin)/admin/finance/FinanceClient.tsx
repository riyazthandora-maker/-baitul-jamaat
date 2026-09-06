"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  ReceiptText,
  Plus,
} from "lucide-react";
import FinanceTable from "./FinanceTable";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "revenue" | "expense";

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
  phone: string;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type RevenueForm = {
  date: string;
  entity_type: "member" | "contact";
  entity_id: string;
  amount: string;
  remarks: string;
  is_received: boolean;
};

type ExpenseForm = {
  date: string;
  entity_type: "member" | "contact";
  entity_id: string;
  amount: string;
  remarks: string;
  is_paid: boolean;
};

type SuccessInfo = {
  type: Tab;
  receipt_number: string | null;
  voucher_number: string | null;
  amount: number;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWindowDates() {
  const today = new Date();
  const min = new Date(today);
  min.setDate(min.getDate() - 30);
  const max = new Date(today);
  max.setDate(max.getDate() + 30);
  return { today: fmtDate(today), min: fmtDate(min), max: fmtDate(max) };
}

// ─── Initial form states ───────────────────────────────────────────────────────

const { today, min: dateMin, max: dateMax } = getWindowDates();

const INIT_REVENUE: RevenueForm = {
  date: today,
  entity_type: "member",
  entity_id: "",
  amount: "",
  remarks: "",
  is_received: false,
};

const INIT_EXPENSE: ExpenseForm = {
  date: today,
  entity_type: "member",
  entity_id: "",
  amount: "",
  remarks: "",
  is_paid: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  color: "green" | "red";
}) {
  const activeClasses =
    color === "green"
      ? "bg-white shadow text-brand-green"
      : "bg-white shadow text-red-600";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        active ? activeClasses : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function EntityToggle({
  value,
  onChange,
}: {
  value: "member" | "contact";
  onChange: (v: "member" | "contact") => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("member")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
          value === "member"
            ? "border-brand-green bg-brand-green/5 text-brand-green"
            : "border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <Users className="w-4 h-4" />
        Masjid Member
      </button>
      <button
        type="button"
        onClick={() => onChange("contact")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
          value === "contact"
            ? "border-brand-gold bg-brand-gold/5 text-amber-700"
            : "border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <Building2 className="w-4 h-4" />
        External Contact
      </button>
    </div>
  );
}

function EntitySelect({
  entityType,
  entityId,
  members,
  contacts,
  loadingEntities,
  onChange,
  onOpenCreateContact,
}: {
  entityType: "member" | "contact";
  entityId: string;
  members: Member[];
  contacts: Contact[];
  loadingEntities: boolean;
  onChange: (id: string) => void;
  onOpenCreateContact: () => void;
}) {
  if (loadingEntities) {
    return (
      <div className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (entityType === "member") {
    return (
      <select
        required
        value={entityId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
      >
        <option value="">— Select member —</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name}
            {m.member_number ? ` (${m.member_number})` : ` · ${m.phone}`}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        required
        value={entityId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green bg-white"
      >
        <option value="">— Select contact —</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.phone ? ` · ${c.phone}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onOpenCreateContact}
        className="flex items-center gap-1.5 text-xs text-brand-green hover:underline"
      >
        <Plus className="w-3.5 h-3.5" />
        Create new contact
      </button>
    </div>
  );
}

function SuccessBanner({
  info,
  onReset,
}: {
  info: SuccessInfo;
  onReset: () => void;
}) {
  const isRevenue = info.type === "revenue";
  const docNumber = isRevenue ? info.receipt_number : info.voucher_number;
  const label = isRevenue ? "Receipt" : "Voucher";

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800">
            {isRevenue ? "Revenue" : "Expense"} recorded successfully
          </p>
          <p className="text-sm text-green-700 mt-0.5">
            Amount: <strong>₹{info.amount.toFixed(2)}</strong>
            {docNumber && (
              <>
                {" "}· {label}:{" "}
                <strong className="font-mono">{docNumber}</strong>
              </>
            )}
            {!docNumber && isRevenue && " · Marked as pending (no receipt generated)"}
            {!docNumber && !isRevenue && " · Marked as unpaid (no voucher generated)"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-green-700 hover:text-green-900 underline"
      >
        Record another entry
      </button>
    </div>
  );
}

// ─── Create Contact Modal (basic — full implementation in Phase 4) ─────────────

function CreateContactModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm({ name: "", email: "", phone: "" });
    setError(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create contact");
      setSaving(false);
      return;
    }
    onCreated(data.contact);
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">New Contact</h2>
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
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Revenue Form ─────────────────────────────────────────────────────────────

function RevenueForm({
  members,
  contacts,
  loadingEntities,
  onContactCreated,
  onSuccess,
}: {
  members: Member[];
  contacts: Contact[];
  loadingEntities: boolean;
  onContactCreated: (c: Contact) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<RevenueForm>(INIT_REVENUE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  function setField<K extends keyof RevenueForm>(key: K, value: RevenueForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Reset entity when toggling entity_type
      if (key === "entity_type") next.entity_id = "";
      return next;
    });
  }

  function handleReset() {
    setForm(INIT_REVENUE);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entity_id) {
      setError("Please select a member or contact.");
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      type: "revenue",
      date: form.date,
      entity_type: form.entity_type,
      entity_id: form.entity_id,
      amount: parseFloat(form.amount),
      remarks: form.remarks || null,
      is_received: form.is_received,
    };

    const res = await fetch("/api/admin/revenue-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to record entry");
      setSaving(false);
      return;
    }

    setSuccess({
      type: "revenue",
      receipt_number: data.entry.receipt_number,
      voucher_number: null,
      amount: data.entry.amount,
    });
    setSaving(false);
    onSuccess();
  }

  if (success) {
    return <SuccessBanner info={success} onReset={handleReset} />;
  }

  return (
    <>
      <CreateContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onCreated={(c) => {
          onContactCreated(c);
          setField("entity_id", c.id);
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-gray-400 font-normal">(±30 days)</span>
          </label>
          <input
            required
            type="date"
            min={dateMin}
            max={dateMax}
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Entity type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Received from
          </label>
          <EntityToggle
            value={form.entity_type}
            onChange={(v) => setField("entity_type", v)}
          />
        </div>

        {/* Entity select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.entity_type === "member" ? "Member" : "Contact"} *
          </label>
          <EntitySelect
            entityType={form.entity_type}
            entityId={form.entity_id}
            members={members}
            contacts={contacts}
            loadingEntities={loadingEntities}
            onChange={(id) => setField("entity_id", id)}
            onOpenCreateContact={() => setContactModalOpen(true)}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₹) *
          </label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Annual subscription, Zakat, etc."
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Is Received toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-800">Payment received</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {form.is_received
                ? "Receipt number will be generated"
                : "Will be recorded as a pending demand"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField("is_received", !form.is_received)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_received ? "bg-brand-green" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_received ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-green text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-brand-green-dark transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ReceiptText className="w-4 h-4" />
          )}
          {saving
            ? "Saving…"
            : form.is_received
            ? "Record & Generate Receipt"
            : "Record Pending Revenue"}
        </button>
      </form>
    </>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

function ExpenseForm({
  members,
  contacts,
  loadingEntities,
  onContactCreated,
  onSuccess,
}: {
  members: Member[];
  contacts: Contact[];
  loadingEntities: boolean;
  onContactCreated: (c: Contact) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ExpenseForm>(INIT_EXPENSE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  function setField<K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "entity_type") next.entity_id = "";
      return next;
    });
  }

  function handleReset() {
    setForm(INIT_EXPENSE);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entity_id) {
      setError("Please select a member or contact.");
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      type: "expense",
      date: form.date,
      entity_type: form.entity_type,
      entity_id: form.entity_id,
      amount: parseFloat(form.amount),
      remarks: form.remarks || null,
      is_paid: form.is_paid,
    };

    const res = await fetch("/api/admin/revenue-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to record entry");
      setSaving(false);
      return;
    }

    setSuccess({
      type: "expense",
      receipt_number: null,
      voucher_number: data.entry.voucher_number,
      amount: data.entry.amount,
    });
    setSaving(false);
    onSuccess();
  }

  if (success) {
    return <SuccessBanner info={success} onReset={handleReset} />;
  }

  return (
    <>
      <CreateContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onCreated={(c) => {
          onContactCreated(c);
          setField("entity_id", c.id);
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-gray-400 font-normal">(±30 days)</span>
          </label>
          <input
            required
            type="date"
            min={dateMin}
            max={dateMax}
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Entity type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paid to
          </label>
          <EntityToggle
            value={form.entity_type}
            onChange={(v) => setField("entity_type", v)}
          />
        </div>

        {/* Entity select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.entity_type === "member" ? "Member" : "Contact"} *
          </label>
          <EntitySelect
            entityType={form.entity_type}
            entityId={form.entity_id}
            members={members}
            contacts={contacts}
            loadingEntities={loadingEntities}
            onChange={(id) => setField("entity_id", id)}
            onOpenCreateContact={() => setContactModalOpen(true)}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₹) *
          </label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Electricity bill, Maintenance, etc."
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>

        {/* Is Paid toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-800">Payment disbursed</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {form.is_paid
                ? "Voucher number will be generated"
                : "Will be recorded as a payable (pending)"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField("is_paid", !form.is_paid)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_paid ? "bg-red-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_paid ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {saving
            ? "Saving…"
            : form.is_paid
            ? "Record & Generate Voucher"
            : "Record Payable Expense"}
        </button>
      </form>
    </>
  );
}

// ─── Root client component ────────────────────────────────────────────────────

export default function FinanceClient() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");
  const [members, setMembers] = useState<Member[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadEntities = useCallback(async () => {
    setLoadingEntities(true);
    const [mRes, cRes] = await Promise.all([
      fetch("/api/admin/members?status=active"),
      fetch("/api/admin/contacts"),
    ]);
    const [mData, cData] = await Promise.all([mRes.json(), cRes.json()]);
    setMembers(mData.members ?? []);
    setContacts(cData.contacts ?? []);
    setLoadingEntities(false);
  }, []);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  function handleContactCreated(contact: Contact) {
    setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleSuccess() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-8">
      {/* Entry form section — constrained width */}
      <div className="max-w-xl space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-brand-green">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Record revenue and expenses for your masjid
          </p>
        </div>

        {/* Tab selector */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1">
          <TabButton
            active={activeTab === "revenue"}
            onClick={() => setActiveTab("revenue")}
            icon={TrendingUp}
            label="Revenue"
            color="green"
          />
          <TabButton
            active={activeTab === "expense"}
            onClick={() => setActiveTab("expense")}
            icon={TrendingDown}
            label="Expense"
            color="red"
          />
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === "revenue" ? (
            <RevenueForm
              members={members}
              contacts={contacts}
              loadingEntities={loadingEntities}
              onContactCreated={handleContactCreated}
              onSuccess={handleSuccess}
            />
          ) : (
            <ExpenseForm
              members={members}
              contacts={contacts}
              loadingEntities={loadingEntities}
              onContactCreated={handleContactCreated}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>

      {/* Transaction history — full width */}
      <div>
        <hr className="border-gray-100 mb-8" />
        <FinanceTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
