import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Outstanding Dues — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

interface DueRow {
  member_id: string;
  member_number: string;
  full_name: string;
  phone: string;
  email: string | null;
  balance: number;
}

export default async function DuesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");
  const masjidId = user.app_metadata.masjid_id as string;

  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("get_outstanding_dues", { p_masjid_id: masjidId });

  const rows = ((data ?? []) as DueRow[]).map((r) => ({ ...r, balance: Number(r.balance) }));
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);

  const csvRows = [
    ["Member No.", "Name", "Phone", "Email", "Balance (₹)"],
    ...rows.map((r) => [r.member_number, r.full_name, r.phone, r.email ?? "", fmt(r.balance)]),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Outstanding Dues</h1>
            <p className="text-white/70 text-sm">Members with unpaid balances</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error.message}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Members with dues</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total outstanding</p>
            <p className="text-2xl font-bold text-red-600 mt-1">₹{fmt(totalBalance)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Members sorted by largest balance</p>
            <ExportCsvButton rows={csvRows} filename="outstanding_dues.csv" />
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">All members are paid up.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.member_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{r.member_number}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/members/${r.member_id}`} className="font-medium text-gray-800 hover:text-brand-green transition-colors">
                          {r.full_name}
                        </Link>
                        {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.phone}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">₹{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
