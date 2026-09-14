"use client";

import { useState, useCallback } from "react";
import { Download, Search, TrendingUp, TrendingDown, Wallet, ArrowUpDown } from "lucide-react";
import type { CashBookEntry } from "@/app/api/admin/reports/cashbook/route";

interface ReportData {
  opening_balance: number;
  entries: CashBookEntry[];
  totals: { cash_in: number; cash_out: number; net: number };
  closing_balance: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  "Member Program":  "bg-blue-100 text-blue-700",
  "Service Fee":     "bg-purple-100 text-purple-700",
  "Contact Revenue": "bg-green-100 text-green-700",
  "Donation":        "bg-teal-100 text-teal-700",
  "Expense":         "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function janFirstISO() {
  return new Date().getFullYear() + "-01-01";
}

function downloadCSV(data: ReportData, from: string, to: string) {
  const rows: string[][] = [];
  rows.push(["Date", "Name", "Category", "Details", "Cash In (₹)", "Cash Out (₹)", "Balance (₹)", "Reference"]);
  rows.push(["", "Opening Balance", "", "", "", "", fmt(data.opening_balance), ""]);

  for (const e of data.entries) {
    rows.push([
      fmtDate(e.txn_date),
      e.entity_name,
      e.category,
      e.sub_category,
      e.cash_in  > 0 ? fmt(e.cash_in)  : "",
      e.cash_out > 0 ? fmt(e.cash_out) : "",
      fmt(e.running_balance),
      e.reference,
    ]);
  }

  rows.push(["", "TOTAL", "", "",
    fmt(data.totals.cash_in),
    fmt(data.totals.cash_out),
    fmt(data.closing_balance),
    "",
  ]);

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cashbook_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CashBookReport() {
  const [from, setFrom] = useState(janFirstISO());
  const [to,   setTo]   = useState(todayISO());
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/cashbook?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setData(json as ReportData);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Cash Book</h1>
          <p className="text-white/70 text-sm mt-0.5">
            All cash in &amp; out — with running balance from day one
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            <Search className="w-4 h-4" />
            {loading ? "Loading…" : "Run Report"}
          </button>
          {data && (
            <button
              onClick={() => downloadCSV(data, from, to)}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors ml-auto"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Opening Balance</p>
              <p className={`text-xl font-bold mt-1 ${data.opening_balance >= 0 ? "text-gray-800" : "text-red-600"}`}>
                ₹{fmt(data.opening_balance)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cash In</p>
              </div>
              <p className="text-xl font-bold text-green-600">₹{fmt(data.totals.cash_in)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cash Out</p>
              </div>
              <p className="text-xl font-bold text-red-600">₹{fmt(data.totals.cash_out)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-4 h-4 text-brand-green" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Closing Balance</p>
              </div>
              <p className={`text-xl font-bold mt-0 ${data.closing_balance >= 0 ? "text-brand-green" : "text-red-600"}`}>
                ₹{fmt(data.closing_balance)}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {data && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {data.entries.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No transactions in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide whitespace-nowrap">Cash In</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-red-600 uppercase tracking-wide whitespace-nowrap">Cash Out</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <ArrowUpDown className="w-3 h-3" /> Balance
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening balance row */}
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                        {from ? fmtDate(from) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs italic" colSpan={2}>
                        Opening Balance (brought forward)
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-700 text-xs">
                        ₹{fmt(data.opening_balance)}
                      </td>
                    </tr>

                    {data.entries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {fmtDate(e.txn_date)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 leading-tight">{e.entity_name}</p>
                          {e.sub_category && (
                            <p className="text-xs text-gray-400 mt-0.5">{e.sub_category}</p>
                          )}
                          {e.reference && (
                            <p className="text-xs text-gray-300 mt-0.5 font-mono">{e.reference}</p>
                          )}
                          {/* Category badge on mobile */}
                          <span className={`sm:hidden inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.cash_in > 0 ? (
                            <span className="font-semibold text-green-600">₹{fmt(e.cash_in)}</span>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {e.cash_out > 0 ? (
                            <span className="font-semibold text-red-500">₹{fmt(e.cash_out)}</span>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${e.running_balance >= 0 ? "text-gray-800" : "text-red-600"}`}>
                            ₹{fmt(e.running_balance)}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide hidden sm:table-cell">
                        Period Total
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide sm:hidden">
                        Period Total
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" />
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        ₹{fmt(data.totals.cash_in)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-500">
                        ₹{fmt(data.totals.cash_out)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-brand-green">
                        ₹{fmt(data.closing_balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!data && !loading && (
          <div className="bg-white rounded-xl shadow-sm py-20 text-center text-gray-400 text-sm">
            Select a date range and click <span className="font-medium text-gray-600">Run Report</span> to generate the cash book.
          </div>
        )}
      </div>
    </div>
  );
}
