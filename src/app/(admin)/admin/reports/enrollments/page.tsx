import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enrollment Report — Reports" };

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

export default async function EnrollmentsPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Enrollment Report</h1>
            <p className="text-white/70 text-sm">Program enrollments and billing summary</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error.message}</div>
        )}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">All programs — enrolled members and charges generated</p>
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No programs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Program</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Cycle</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Members</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Period Amt</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Billed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.program_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.program_name}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize hidden sm:table-cell">{r.recurrence}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-semibold">{r.enrolled_count}</td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                        {r.period_amount > 0 ? `₹${fmt(r.period_amount)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {r.total_charged > 0 ? `₹${fmt(r.total_charged)}` : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {r.active ? "Active" : "Inactive"}
                        </span>
                      </td>
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
