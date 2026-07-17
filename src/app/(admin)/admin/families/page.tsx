import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users2, Plus, ChevronRight } from "lucide-react";

export default async function FamiliesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const { data: families } = await supabase
    .from("families")
    .select("id, name, head_member_id, family_members(id)")
    .eq("masjid_id", masjidId)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Families</h1>
        <Link
          href="/admin/families/new"
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Family
        </Link>
      </div>

      {families && families.length > 0 ? (
        <div className="space-y-3">
          {families.map((family) => (
            <Link
              key={family.id}
              href={`/admin/families/${family.id}`}
              className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{family.name}</p>
                  <p className="text-sm text-gray-400">
                    {Array.isArray(family.family_members) ? family.family_members.length : 0} member(s)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
          <Users2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">No families yet. Create one to group members.</p>
          <Link
            href="/admin/families/new"
            className="inline-flex items-center gap-2 mt-4 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Family
          </Link>
        </div>
      )}
    </div>
  );
}
