import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Revenue by Program — Reports" };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n);
}

interface ProgramRow {
  program_id: string;
  program_name: string;
  recurrence: string;
  active: boolean;
  enrolled_count: number;
  period_amount: number;
  total_charged: number;
}

export default async function ProgramsReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");
  const masjidId = user.app_metadata.masjid_id as string;

  const admin = await createAdminClient();
  const { data, error } = await admin.rpc("get_program_revenue", { p_masjid_id: masjidId });

  const rows = ((data ?? []) as ProgramRow[]).map((r) => ({
    ...r,
    enrolled_count: Number(r.enrolled_count),
    period_amount:  Number(r.period_amount),
    total_charged:  Number(r.total_charged),
  }));

  const totalCharged = rows.reduce((s, r) => s + r.total_charged, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Revenue by Program</h1>
            <p className="text-white/70 text-sm">Enrollment counts and total charges per subscription</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error.message}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Programs</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total billed (all time)</p>
            <p className="text-2xl font-bold text-brand-green mt-1">₹{fmt(totalCharged)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">All programs — all-time charges generated</p>
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No programs found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Program</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Cycle</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Members</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Per Period</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Billed</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">% Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.program_id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!r.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.program_name}</p>
                      {!r.active && <p className="text-xs text-gray-400">Inactive</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize hidden sm:table-cell">{r.recurrence}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{r.enrolled_count}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                      {r.period_amount > 0 ? `₹${fmt(r.period_amount)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-green">
                      {r.total_charged > 0 ? `₹${fmt(r.total_charged)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {totalCharged > 0 ? `${((r.total_charged / totalCharged) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
