import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Collections — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

function defaultFrom() { return `${new Date().getFullYear()}-01-01`; }
function defaultTo()   { return new Date().toISOString().slice(0, 10); }

const SOURCE_STYLES: Record<string, string> = {
  "Member Payments": "bg-blue-100 text-blue-700",
  "Contact Revenue": "bg-teal-100 text-teal-700",
  "Donations":       "bg-purple-100 text-purple-700",
};

interface CollectionRow { source: string; txn_count: number; total: number; }

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const from = params.from ?? defaultFrom();
  const to   = params.to   ?? defaultTo();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");
  const masjidId = user.app_metadata.masjid_id as string;

  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("get_collections_summary", {
    p_masjid_id: masjidId,
    p_from: from,
    p_to:   to,
  });

  const rows = ((data ?? []) as CollectionRow[]).map((r) => ({
    ...r,
    txn_count: Number(r.txn_count),
    total:     Number(r.total),
  }));

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandCount = rows.reduce((s, r) => s + r.txn_count, 0);

  const csvRows = [
    ["Source", "Transactions", "Total (₹)"],
    ...rows.map((r) => [r.source, String(r.txn_count), fmt(r.total)]),
    ["TOTAL", String(grandCount), fmt(grandTotal)],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Collections</h1>
            <p className="text-white/70 text-sm">All money received, by source</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <DateRangeFilter from={from} to={to} />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error.message}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total transactions</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{grandCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total collected</p>
            <p className="text-2xl font-bold text-green-600 mt-1">₹{fmt(grandTotal)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Breakdown by source</p>
            <ExportCsvButton rows={csvRows} filename={`collections_${from}_${to}.csv`} />
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No collections in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Transactions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.source} className="border-b border-gray-50">
                    <td className="px-4 py-4">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_STYLES[r.source] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-700">{r.txn_count}</td>
                    <td className="px-4 py-4 text-right font-bold text-green-600">₹{fmt(r.total)}</td>
                    <td className="px-4 py-4 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {grandTotal > 0 ? `${((r.total / grandTotal) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-xs text-gray-700 uppercase">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{grandCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">₹{fmt(grandTotal)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
