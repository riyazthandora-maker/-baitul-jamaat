"use client";

import { useState, useRef } from "react";
import { Plus, X, Loader2, Tag, IndianRupee, CheckCircle2, PenLine } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type RevenueItem = {
  id: string;
  code: string;
  name: string;
  default_amount: number;
  description: string | null;
  is_active: boolean;
};

type Member = {
  id: string;
  full_name: string;
  member_number: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Add Item Inline Form ─────────────────────────────────────────────────────

function AddItemInline({
  onAdded,
  onCancel,
}: {
  onAdded: (item: RevenueItem) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/revenue-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        default_amount: parseFloat(amount),
        description: desc.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add item");
      return;
    }
    onAdded(data.item as RevenueItem);
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
      <p className="text-xs font-semibold text-gray-600">New fee code</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Code *</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="NIKKAH"
            maxLength={20}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Default Amount (₹) *</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-0.5 block">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nikkah Registration Fee"
          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-0.5 block">Description (optional)</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Fee for nikkah registration at masjid"
          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !code || !name || !amount}
          className="flex-1 py-1.5 rounded-lg bg-brand-green text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Record Revenue Modal ─────────────────────────────────────────────────────

function RecordRevenueModal({
  members,
  items,
  onClose,
  onItemAdded,
}: {
  members: Member[];
  items: RevenueItem[];
  onClose: () => void;
  onItemAdded: (item: RevenueItem) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activeItems = items.filter((i) => i.is_active);

  const filteredMembers = memberSearch.trim()
    ? members.filter(
        (m) =>
          m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          (m.member_number ?? "").toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members;

  function handleItemChange(id: string) {
    setItemId(id);
    const item = activeItems.find((i) => i.id === id);
    if (item) setAmount(String(item.default_amount));
  }

  function handleItemAdded(item: RevenueItem) {
    onItemAdded(item);
    setItemId(item.id);
    setAmount(String(item.default_amount));
    setShowAddItem(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/member-revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        revenue_item_id: itemId,
        date,
        amount: parseFloat(amount),
        description: description.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to record charge");
      return;
    }
    setSuccess(true);
  }

  function handleReset() {
    setMemberId(""); setMemberSearch(""); setItemId(""); setDate(today());
    setAmount(""); setDescription(""); setShowAddItem(false);
    setError(null); setSuccess(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Record Service Fee</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-brand-green mx-auto" />
            <div>
              <p className="font-semibold text-gray-800">Charge recorded</p>
              <p className="text-sm text-gray-500 mt-1">
                The fee has been added to the member&apos;s ledger.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Record another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold hover:bg-brand-green-dark"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Member search + select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
              <input
                type="search"
                placeholder="Search by name or member number…"
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberId(""); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green mb-1 placeholder:text-gray-400"
              />
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                size={Math.min(6, filteredMembers.length + 1)}
              >
                <option value="">— select member —</option>
                {filteredMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}{m.member_number ? ` · ${m.member_number}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {/* Fee Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Fee Code *</label>
                {!showAddItem && (
                  <button
                    type="button"
                    onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-1 text-xs text-brand-green hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add new
                  </button>
                )}
              </div>
              <select
                value={itemId}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="">— select fee code —</option>
                {activeItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name} (₹{Number(i.default_amount).toFixed(0)})
                  </option>
                ))}
              </select>
              {showAddItem && (
                <AddItemInline
                  onAdded={handleItemAdded}
                  onCancel={() => setShowAddItem(false)}
                />
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) *
                {itemId && (
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    — override if different from default
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !memberId || !itemId || !date || !amount}
                className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Save charge"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item Codes Modal ─────────────────────────────────────────────────────────

function ItemCodesModal({
  items,
  onClose,
  onItemsChanged,
}: {
  items: RevenueItem[];
  onClose: () => void;
  onItemsChanged: (items: RevenueItem[]) => void;
}) {
  const [list, setList] = useState<RevenueItem[]>(items);
  const [showAdd, setShowAdd] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(item: RevenueItem) {
    setToggling(item.id);
    const res = await fetch(`/api/admin/revenue-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = list.map((i) => (i.id === item.id ? data.item : i));
      setList(updated);
      onItemsChanged(updated);
    }
    setToggling(null);
  }

  function handleAdded(item: RevenueItem) {
    const updated = [...list, item].sort((a, b) => a.code.localeCompare(b.code));
    setList(updated);
    onItemsChanged(updated);
    setShowAdd(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Service Fee Codes</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Fee codes are reusable charge templates (e.g. Nikkah Fee, House Warming). The default
          amount can be overridden when recording a charge.
        </p>

        {list.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No fee codes yet. Add your first one below.
          </div>
        ) : (
          <div className="divide-y rounded-xl border border-gray-100 overflow-hidden">
            {list.map((item) => (
              <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${!item.is_active ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    ₹{Number(item.default_amount).toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={toggling === item.id}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      item.is_active
                        ? "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
                        : "border-brand-green/30 text-brand-green hover:bg-brand-green/5"
                    }`}
                  >
                    {toggling === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.is_active ? (
                      "Deactivate"
                    ) : (
                      "Activate"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAdd ? (
          <AddItemInline onAdded={handleAdded} onCancel={() => setShowAdd(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors"
          >
            <Plus className="w-4 h-4" /> Add fee code
          </button>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RevenueActions({
  initialItems,
  members,
}: {
  initialItems: RevenueItem[];
  members: Member[];
}) {
  const [items, setItems] = useState<RevenueItem[]>(initialItems);
  const [showRecord, setShowRecord] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  function handleItemAdded(item: RevenueItem) {
    setItems((prev) => [...prev, item].sort((a, b) => a.code.localeCompare(b.code)));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowCodes(true)}
        className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Tag className="w-4 h-4" /> Fee Codes
      </button>

      <button
        type="button"
        onClick={() => setShowRecord(true)}
        className="flex items-center gap-2 border border-brand-green text-brand-green px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green/5 transition-colors"
      >
        <IndianRupee className="w-4 h-4" /> Record Fee
      </button>

      {showRecord && (
        <RecordRevenueModal
          members={members}
          items={items}
          onClose={() => setShowRecord(false)}
          onItemAdded={handleItemAdded}
        />
      )}

      {showCodes && (
        <ItemCodesModal
          items={items}
          onClose={() => setShowCodes(false)}
          onItemsChanged={setItems}
        />
      )}
    </>
  );
}
