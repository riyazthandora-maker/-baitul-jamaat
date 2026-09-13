import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExportCsvButton from "@/components/reports/ExportCsvButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Member Directory — Reports" };

export default async function MemberDirectoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("id, member_number, full_name, phone, email, gender, qualification, job, dob, created_at")
    .eq("status", "active")
    .order("member_number", { ascending: true });

  const rows = members ?? [];

  const csvRows = [
    ["Member No.", "Name", "Phone", "Email", "Gender", "Qualification", "Job", "Date of Birth", "Joined"],
    ...rows.map((m) => [
      m.member_number ?? "",
      m.full_name,
      m.phone,
      m.email ?? "",
      m.gender ?? "",
      m.qualification ?? "",
      m.job ?? "",
      m.dob ?? "",
      new Date(m.created_at).toLocaleDateString("en-IN"),
    ]),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Member Directory</h1>
            <p className="text-white/70 text-sm">{rows.length} active members</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Active members</p>
            <ExportCsvButton rows={csvRows} filename="member_directory.csv" />
          </div>
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No active members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Gender</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Qualification</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{m.member_number}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/members/${m.id}`} className="font-medium text-gray-800 hover:text-brand-green transition-colors">
                          {m.full_name}
                        </Link>
                        {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.phone}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{m.gender ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{m.qualification ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                        {new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
