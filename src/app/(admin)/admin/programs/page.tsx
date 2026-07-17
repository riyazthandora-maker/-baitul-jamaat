import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ToggleLeft, ToggleRight, Users } from "lucide-react";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const { data: programs } = await supabase
    .from("programs")
    .select("*, enrollments(count)")
    .eq("masjid_id", masjidId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Revenue Programs</h1>
        <Link
          href="/admin/programs/new"
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Plus className="w-4 h-4" /> New Program
        </Link>
      </div>

      {!programs?.length ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-lg mb-2">No programs yet</p>
          <p className="text-sm">Create a program to start billing members.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p) => {
            const count = (p.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Link
                key={p.id}
                href={`/admin/programs/${p.id}`}
                className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {p.active ? (
                        <ToggleRight className="w-5 h-5 text-brand-green flex-shrink-0" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <h2 className="font-semibold text-gray-800 truncate">{p.name}</h2>
                    </div>
                    <p className="text-sm text-gray-500 ml-7">
                      ₹{Number(p.default_amount).toFixed(0)} /{" "}
                      {p.recurrence} · starts{" "}
                      {new Date(p.start_date).toLocaleDateString("en-IN")}
                      {p.end_date && ` · ends ${new Date(p.end_date).toLocaleDateString("en-IN")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 flex-shrink-0">
                    <Users className="w-4 h-4" />
                    {count}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
