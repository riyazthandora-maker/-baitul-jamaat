import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pending Approvals — Reports" };

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function PendingApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("id, member_number, full_name, phone, created_at, duplicate_flag")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = members ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Pending Approvals</h1>
            <p className="text-white/70 text-sm">{rows.length} registrations awaiting review — oldest first</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm py-20 text-center text-gray-400 text-sm">
            No pending registrations.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-amber-600 uppercase">Waiting</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const days = daysSince(m.created_at);
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">{m.member_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/members/${m.id}`} className="font-medium text-gray-800 hover:text-brand-green transition-colors">
                            {m.full_name}
                          </Link>
                          {m.duplicate_flag === "possible_duplicate" && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">⚠ Possible duplicate</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.phone}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            days > 7 ? "bg-red-100 text-red-700" : days > 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {days}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
