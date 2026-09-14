import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Service Fees — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

function defaultFrom() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

interface FeeRow {
  item_id: string;
  code: string;
  name: string;
  is_active: boolean;
  charge_count: number;
  total_charged: number;
}

export default async function ServiceFeesPage({
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
  const { data, error } = await admin.rpc("get_service_fee_summary", {
    p_masjid_id: masjidId,
    p_from: from,
    p_to:   to,
  });

  const rows = ((data ?? []) as FeeRow[]).map((r) => ({
    ...r,
    charge_count:  Number(r.charge_count),
    total_charged: Number(r.total_charged),
  }));

  const totals = rows.reduce((s, r) => ({ count: s.count + r.charge_count, amount: s.amount + r.total_charged }), { count: 0, amount: 0 });

  const csvRows = [
    ["Code", "Name", "Status", "Count", "Total Charged (₹)"],
    ...rows.map((r) => [r.code, r.name, r.is_active ? "Active" : "Inactive", String(r.charge_count), fmt(r.total_charged)]),
    ["", "TOTAL", "", String(totals.count), fmt(totals.amount)],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Service Fees</h1>
            <p className="text-white/70 text-sm">Fee code usage and revenue</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <DateRangeFilter from={from} to={to} />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error.message}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total transactions</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totals.count}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total charged</p>
            <p className="text-2xl font-bold text-brand-green mt-1">₹{fmt(totals.amount)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">By fee code</p>
            <ExportCsvButton rows={csvRows} filename={`service_fees_${from}_${to}.csv`} />
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No service fees in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Charged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-purple-700 bg-purple-50/50">{r.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.charge_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {r.total_charged > 0 ? `₹${fmt(r.total_charged)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-xs text-gray-700 uppercase" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{totals.count}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand-green">₹{fmt(totals.amount)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
