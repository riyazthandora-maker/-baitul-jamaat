"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Pencil,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  X,
  Search,
  ReceiptText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterState = {
  type: "" | "revenue" | "expense";
  status: "" | "received" | "pending" | "paid" | "unpaid";
  entity_type: "" | "member" | "contact";
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
  search: string;
  entity_search: string;
  page: number;
};

type Entry = {
  id: string;
  type: "revenue" | "expense";
  date: string;
  entity_type: "member" | "contact";
  entity_id: string;
  entity_name: string;
  entity_member_number: string | null;
  entity_email: string | null;
  amount: number;
  remarks: string | null;
  is_received: boolean;
  is_paid: boolean;
  receipt_number: string | null;
  voucher_number: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

const INIT_FILTERS: FilterState = {
  type: "",
  status: "",
  entity_type: "",
  date_from: "",
  date_to: "",
  amount_min: "",
  amount_max: "",
  search: "",
  entity_search: "",
  page: 1,
};

// ─── Date window helper ───────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getEditWindow() {
  const today = new Date();
  const min = new Date(today); min.setDate(min.getDate() - 30);
  const max = new Date(today); max.setDate(max.getDate() + 30);
  return { min: fmtDate(min), max: fmtDate(max) };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ entry }: { entry: Entry }) {
  if (entry.type === "revenue") {
    return entry.is_received ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> Received
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  }
  return entry.is_paid ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      <CheckCircle2 className="w-3 h-3" /> Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
      <Clock className="w-3 h-3" /> Payable
    </span>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: (updated: Entry) => void;
}) {
  const { min: dateMin, max: dateMax } = getEditWindow();
  const [date, setDate] = useState(entry.date);
  const [remarks, setRemarks] = useState(entry.remarks ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/revenue-expenses/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, remarks: remarks || null }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to update entry");
      setSaving(false);
      return;
    }

    onSaved({ ...entry, date: data.entry.date, remarks: data.entry.remarks });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Edit Entry</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">
            {entry.type === "revenue" ? "Revenue" : "Expense"}
          </span>{" "}
          · ₹{Number(entry.amount).toLocaleString("en-IN")} · {entry.entity_name}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-gray-400 font-normal">(±30 days)</span>
            </label>
            <input
              required
              type="date"
              min={dateMin}
              max={dateMax}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
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
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  onEdit,
  onUpdated,
}: {
  entry: Entry;
  onEdit: (e: Entry) => void;
  onUpdated: (e: Entry) => void;
}) {
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const docNumber = entry.type === "revenue" ? entry.receipt_number : entry.voucher_number;
  const isRevenue = entry.type === "revenue";

  async function handleResend() {
    setResending(true);
    await fetch(`/api/admin/revenue-expenses/${entry.id}/resend`, { method: "POST" });
    setResending(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 3000);
  }

  async function handleGenerateReceipt() {
    setGeneratingReceipt(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/admin/revenue-expenses/${entry.id}/generate-receipt`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.entry?.receipt_number) {
        setReceiptError(data.error ?? "Could not generate receipt");
        return;
      }
      window.open(`/api/admin/revenue-expenses/${entry.id}/receipt`, "_blank", "noopener,noreferrer");
      onUpdated({ ...entry, receipt_number: data.entry.receipt_number });
    } catch {
      setReceiptError("Could not generate receipt");
    } finally {
      setGeneratingReceipt(false);
    }
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isRevenue ? "bg-green-50" : "bg-red-50"
          }`}
        >
          {isRevenue ? (
            <TrendingUp className="w-4 h-4 text-brand-green" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* Left: entity + date */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm text-gray-900 truncate">
                  {entry.entity_name}
                </span>
                {entry.entity_member_number && (
                  <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                    {entry.entity_member_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(entry.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {entry.remarks && (
                  <span className="ml-1.5 text-gray-400">· {entry.remarks}</span>
                )}
              </p>
            </div>

            {/* Right: amount */}
            <span
              className={`text-base font-bold flex-shrink-0 ${
                isRevenue ? "text-brand-green" : "text-red-600"
              }`}
            >
              {isRevenue ? "+" : "−"}₹{Number(entry.amount).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Second row: status + doc number + actions */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge entry={entry} />

            {docNumber && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <ReceiptText className="w-3 h-3" />
                {docNumber}
              </span>
            )}

            {/* Actions */}
            <div className="ml-auto flex items-center gap-1">
              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(entry)}
                title="Edit entry"
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-green hover:bg-brand-green/5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Resend email */}
              {docNumber && entry.entity_email && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  title={resendDone ? "Sent!" : "Resend email"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    resendDone
                      ? "text-green-600 bg-green-50"
                      : "text-gray-400 hover:text-brand-green hover:bg-brand-green/5"
                  }`}
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {/* Additional receipt option for pending external revenue */}
              {isRevenue && entry.entity_type === "contact" && !docNumber && (
                <button
                  type="button"
                  onClick={handleGenerateReceipt}
                  disabled={generatingReceipt}
                  title="Generate receipt without marking as received"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-green hover:bg-brand-green/5 transition-colors disabled:opacity-50"
                >
                  {generatingReceipt ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ReceiptText className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {/* Member ledger link */}
              {entry.entity_type === "member" && (
                <Link
                  href={`/admin/members/${entry.entity_id}`}
                  title="View member ledger"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-green hover:bg-brand-green/5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
          {receiptError && (
            <p className="mt-1 text-xs text-red-600">{receiptError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  const [showMore, setShowMore] = useState(false);

  // Status options depend on type
  const statusOptions =
    filters.type === "revenue"
      ? [{ value: "", label: "Any status" }, { value: "received", label: "Received" }, { value: "pending", label: "Pending" }]
      : filters.type === "expense"
      ? [{ value: "", label: "Any status" }, { value: "paid", label: "Paid" }, { value: "unpaid", label: "Payable" }]
      : [
          { value: "", label: "Any status" },
          { value: "received", label: "Received" },
          { value: "pending", label: "Pending" },
          { value: "paid", label: "Paid" },
          { value: "unpaid", label: "Payable" },
        ];

  function handleTypeChange(t: FilterState["type"]) {
    // Reset status when type changes if it's now irrelevant
    const statusStillValid = statusOptions.some((o) => o.value === filters.status);
    onChange({ type: t, status: statusStillValid ? filters.status : "", page: 1 });
  }

  return (
    <div className="space-y-3">
      {/* Row 1: type tabs + status + search */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Type buttons */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["", "revenue", "expense"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filters.type === t
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "" ? "All" : t === "revenue" ? "Revenue" : "Expense"}
            </button>
          ))}
        </div>

        {/* Status select */}
        <select
          value={filters.status}
          onChange={(e) =>
            onChange({ status: e.target.value as FilterState["status"], page: 1 })
          }
          className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Receipt / voucher no."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-green placeholder:text-gray-400"
          />
        </div>

        {/* More filters toggle */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showMore
              ? "border-brand-green text-brand-green bg-brand-green/5"
              : "border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </button>
      </div>

      {/* Row 2: expanded filters */}
      {showMore && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">Date</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => onChange({ date_from: e.target.value, page: 1 })}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => onChange({ date_to: e.target.value, page: 1 })}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>

          {/* Amount range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">₹</span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={filters.amount_min}
              onChange={(e) => onChange({ amount_min: e.target.value, page: 1 })}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.amount_max}
              onChange={(e) => onChange({ amount_max: e.target.value, page: 1 })}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>

          {/* Entity type */}
          <select
            value={filters.entity_type}
            onChange={(e) =>
              onChange({ entity_type: e.target.value as FilterState["entity_type"], page: 1 })
            }
            className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
          >
            <option value="">All entities</option>
            <option value="member">Members only</option>
            <option value="contact">Contacts only</option>
          </select>

          {/* Entity search */}
          <input
            type="search"
            placeholder="Member or contact name / ID"
            value={filters.entity_search}
            onChange={(e) => onChange({ entity_search: e.target.value, page: 1 })}
            className="min-w-48 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
          />

          {/* Clear all */}
          <button
            type="button"
            onClick={() => onChange({ ...INIT_FILTERS })}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors ml-auto"
          >
            <X className="w-3.5 h-3.5" /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Table Component ─────────────────────────────────────────────────────

export default function FinanceTable({ refreshKey }: { refreshKey: number }) {
  const [filters, setFilters] = useState<FilterState>(INIT_FILTERS);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Entry | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async (f: FilterState) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.type)        params.set("type", f.type);
    if (f.status)      params.set("status", f.status);
    if (f.entity_type) params.set("entity_type", f.entity_type);
    if (f.date_from)   params.set("date_from", f.date_from);
    if (f.date_to)     params.set("date_to", f.date_to);
    if (f.amount_min)  params.set("amount_min", f.amount_min);
    if (f.amount_max)  params.set("amount_max", f.amount_max);
    if (f.search)      params.set("search", f.search);
    if (f.entity_search) params.set("entity_search", f.entity_search);
    params.set("page", String(f.page));
    params.set("page_size", String(PAGE_SIZE));

    const res = await fetch(`/api/admin/revenue-expenses?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, []);

  // Debounced effect — fires whenever filters or refreshKey change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEntries(filters), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, refreshKey, fetchEntries]);

  function patchFilters(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleEntryUpdated(updated: Entry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditTarget(null);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(filters.page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700">Transaction History</h2>
        {total > 0 && !loading && (
          <span className="text-xs text-gray-400">
            {total.toLocaleString("en-IN")} record{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={patchFilters} />

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          entry={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEntryUpdated}
        />
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <ReceiptText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No entries found</p>
            {(filters.type || filters.status || filters.search || filters.date_from) && (
              <button
                type="button"
                onClick={() => patchFilters(INIT_FILTERS)}
                className="mt-2 text-xs text-brand-green hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={setEditTarget}
                onUpdated={handleEntryUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p className="text-xs">
            Showing {showingFrom}–{showingTo} of {total.toLocaleString("en-IN")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => patchFilters({ page: filters.page - 1 })}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="flex items-center px-3 py-1.5 text-xs text-gray-500">
              {filters.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => patchFilters({ page: filters.page + 1 })}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
