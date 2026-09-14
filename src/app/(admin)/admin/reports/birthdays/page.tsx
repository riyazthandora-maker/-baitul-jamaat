import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Birthday Report — Reports" };

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function age(dob: string) {
  const today = new Date();
  const d = new Date(dob);
  let a = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) a--;
  return a;
}

function daysUntil(dob: string) {
  const today = new Date();
  const d = new Date(dob);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function BirthdayReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const month = parseInt(params.month ?? String(new Date().getMonth() + 1), 10);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") redirect("/login");

  const { data: members } = await supabase
    .from("members")
    .select("id, member_number, full_name, phone, dob")
    .eq("status", "active")
    .not("dob", "is", null)
    .order("dob", { ascending: true });

  const filtered = (members ?? [])
    .filter((m) => m.dob && new Date(m.dob).getMonth() + 1 === month)
    .sort((a, b) => new Date(a.dob!).getDate() - new Date(b.dob!).getDate());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/reports" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Birthday Report</h1>
            <p className="text-white/70 text-sm">{filtered.length} birthdays in {MONTHS[month - 1]}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Month selector */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-2">
          {MONTHS.map((name, i) => (
            <Link
              key={i}
              href={`?month=${i + 1}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                month === i + 1
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {name.slice(0, 3)}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">
              No birthdays in {MONTHS[month - 1]}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Days</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const d = new Date(m.dob!);
                  const days = daysUntil(m.dob!);
                  const isToday = days === 0;
                  const isSoon  = days <= 7 && days > 0;
                  return (
                    <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isToday ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{m.member_number}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/members/${m.id}`} className="font-medium text-gray-800 hover:text-brand-green transition-colors">
                          {m.full_name}
                        </Link>
                        {isToday && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🎂 Today!</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.phone}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.getDate()} {MONTHS[d.getMonth()]}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 font-medium">{age(m.dob!)}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isToday ? "bg-amber-100 text-amber-700"
                          : isSoon  ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                        }`}>
                          {isToday ? "Today" : `${days}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
