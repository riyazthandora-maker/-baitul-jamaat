import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import YearFilter from "@/components/reports/YearFilter";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Monthly P&L — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

interface PnlRow {
  month_num: number;
  month_name: string;
  member_payments: number;
  contact_revenue: number;
  donations: number;
  total_revenue: number;
  total_expense: number;
  net: number;
}

export default async function PnlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const year = parseInt(params.year ?? String(new Date().getFullYear()), 10);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");
  const masjidId = user.app_metadata.masjid_id as string;

  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("get_monthly_pnl", { p_masjid_id: masjidId, p_year: year });

  const rows = ((data ?? []) as PnlRow[]).map((r) => ({
    ...r,
    member_payments: Number(r.member_payments),
    contact_revenue: Number(r.contact_revenue),
    donations:       Number(r.donations),
    total_revenue:   Number(r.total_revenue),
    total_expense:   Number(r.total_expense),
    net:             Number(r.net),
  }));

  const totals = rows.reduce(
    (s, r) => ({
      member_payments: s.member_payments + r.member_payments,
      contact_revenue: s.contact_revenue + r.contact_revenue,
      donations:       s.donations       + r.donations,
      total_revenue:   s.total_revenue   + r.total_revenue,
      total_expense:   s.total_expense   + r.total_expense,
      net:             s.net             + r.net,
    }),
    { member_payments: 0, contact_revenue: 0, donations: 0, total_revenue: 0, total_expense: 0, net: 0 }
  );

  const csvRows = [
    ["Month", "Member Payments", "Contact Revenue", "Donations", "Total Revenue", "Expense", "Net"],
    ...rows.map((r) => [r.month_name, fmt(r.member_payments), fmt(r.contact_revenue), fmt(r.donations), fmt(r.total_revenue), fmt(r.total_expense), fmt(r.net)]),
    ["TOTAL", fmt(totals.member_payments), fmt(totals.contact_revenue), fmt(totals.donations), fmt(totals.total_revenue), fmt(totals.total_expense), fmt(totals.net)],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Monthly P&L — {year}</h1>
            <p className="text-white/70 text-sm">Revenue vs expense by month</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <YearFilter current={year} />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error.message}</div>
        )}

        {/* Annual summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Revenue</p>
            <p className="text-xl font-bold text-green-600 mt-1">₹{fmt(totals.total_revenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Expense</p>
            <p className="text-xl font-bold text-red-500 mt-1">₹{fmt(totals.total_expense)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Net Surplus</p>
            <p className={`text-xl font-bold mt-1 ${totals.net >= 0 ? "text-brand-green" : "text-red-600"}`}>
              ₹{fmt(totals.net)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Month-by-month breakdown</p>
            <ExportCsvButton rows={csvRows} filename={`pnl_${year}.csv`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Month</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 uppercase hidden md:table-cell">Member Pmts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-teal-500 uppercase hidden md:table-cell">Contact Rev</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-purple-500 uppercase hidden md:table-cell">Donations</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase">Expense</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hasData = r.total_revenue > 0 || r.total_expense > 0;
                  return (
                    <tr key={r.month_num} className={`border-b border-gray-50 ${hasData ? "hover:bg-gray-50/50" : "opacity-40"}`}>
                      <td className="px-4 py-3 font-medium text-gray-700">{r.month_name}</td>
                      <td className="px-4 py-3 text-right text-blue-600 hidden md:table-cell">{r.member_payments > 0 ? `₹${fmt(r.member_payments)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-teal-600 hidden md:table-cell">{r.contact_revenue > 0 ? `₹${fmt(r.contact_revenue)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-purple-600 hidden md:table-cell">{r.donations > 0 ? `₹${fmt(r.donations)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{r.total_revenue > 0 ? `₹${fmt(r.total_revenue)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-500">{r.total_expense > 0 ? `₹${fmt(r.total_expense)}` : "—"}</td>
                      <td className={`px-4 py-3 text-right font-bold ${r.net > 0 ? "text-brand-green" : r.net < 0 ? "text-red-600" : "text-gray-400"}`}>
                        {hasData ? `₹${fmt(r.net)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Annual Total</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 hidden md:table-cell">₹{fmt(totals.member_payments)}</td>
                  <td className="px-4 py-3 text-right font-bold text-teal-600 hidden md:table-cell">₹{fmt(totals.contact_revenue)}</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-600 hidden md:table-cell">₹{fmt(totals.donations)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">₹{fmt(totals.total_revenue)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">₹{fmt(totals.total_expense)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totals.net >= 0 ? "text-brand-green" : "text-red-600"}`}>₹{fmt(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
