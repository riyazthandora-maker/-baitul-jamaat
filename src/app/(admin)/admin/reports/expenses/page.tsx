import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Expenses by Contact — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

function defaultFrom() { return `${new Date().getFullYear()}-01-01`; }
function defaultTo()   { return new Date().toISOString().slice(0, 10); }

interface ExpenseRow {
  contact_id: string;
  contact_name: string;
  expense_count: number;
  total_paid: number;
  latest_date: string | null;
}

export default async function ExpensesByContactPage({
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
  const { data, error } = await admin.rpc("get_expense_by_contact", {
    p_masjid_id: masjidId,
    p_from: from,
    p_to:   to,
  });

  const rows = ((data ?? []) as ExpenseRow[]).map((r) => ({
    ...r,
    expense_count: Number(r.expense_count),
    total_paid:    Number(r.total_paid),
  }));

  const grandTotal = rows.reduce((s, r) => s + r.total_paid, 0);

  const csvRows = [
    ["Contact", "Transactions", "Total Paid (₹)", "Latest Date"],
    ...rows.map((r) => [
      r.contact_name,
      String(r.expense_count),
      fmt(r.total_paid),
      r.latest_date ? new Date(r.latest_date).toLocaleDateString("en-IN") : "",
    ]),
    ["TOTAL", "", fmt(grandTotal), ""],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Expenses by Contact</h1>
            <p className="text-white/70 text-sm">Total disbursed per vendor / payee</p>
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
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contacts with expenses</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total paid out</p>
            <p className="text-2xl font-bold text-red-600 mt-1">₹{fmt(grandTotal)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Sorted by largest spend</p>
            <ExportCsvButton rows={csvRows} filename={`expenses_by_contact_${from}_${to}.csv`} />
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No paid expenses in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Txns</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Paid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Latest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.contact_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.contact_name}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.expense_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">₹{fmt(r.total_paid)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                      {r.latest_date
                        ? new Date(r.latest_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-xs text-gray-700 uppercase" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">₹{fmt(grandTotal)}</td>
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
