"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import VoidButton from "@/components/VoidButton";

const INITIAL_SHOW = 20;

type Entry = {
  id: string;
  created_at: string;
  transaction_date: string | null;
  type: string;
  amount: number;
  description: string | null;
  voided_at: string | null;
  void_reason: string | null;
  programs: { name: string } | null;
  revenue_items: { name: string; code: string } | null;
};

function fmtDate(entry: Entry) {
  const raw = entry.transaction_date ?? entry.created_at;
  // DATE strings ("2026-09-07") parse as UTC midnight; add noon to avoid day-off in IST
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  return d.toLocaleDateString("en-IN");
}

export default function LedgerList({ entries }: { entries: Entry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, INITIAL_SHOW);
  const hiddenCount = entries.length - INITIAL_SHOW;

  return (
    <div className="divide-y text-sm">
      {visible.map((e) => (
        <div
          key={e.id}
          className={`flex items-center gap-3 py-2.5 px-1 ${e.voided_at ? "opacity-40 line-through" : ""}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {e.description ?? e.programs?.name ?? e.revenue_items?.name ?? e.type}
              {e.programs?.name && e.description && (
                <span className="text-gray-400 font-normal ml-1">· {e.programs.name}</span>
              )}
              {e.revenue_items?.code && (
                <span className="ml-1.5 text-xs font-mono font-semibold text-brand-green bg-brand-green/10 px-1 py-0.5 rounded">
                  {e.revenue_items.code}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {fmtDate(e)}
              {e.void_reason && ` — voided: ${e.void_reason}`}
            </p>
          </div>
          <p className={`font-semibold flex-shrink-0 ${(e.type === "charge" || e.type === "opening_balance") ? "text-red-600" : "text-brand-green"}`}>
            {(e.type === "charge" || e.type === "opening_balance") ? "+" : "−"} ₹{Number(e.amount).toFixed(0)}
          </p>
          {!e.voided_at && e.type !== "payment" && (
            <VoidButton endpoint={`/api/admin/ledger/${e.id}/void`} />
          )}
        </div>
      ))}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-gray-400 hover:text-brand-green transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Show {hiddenCount} older {hiddenCount === 1 ? "entry" : "entries"}
        </button>
      )}
    </div>
  );
}
