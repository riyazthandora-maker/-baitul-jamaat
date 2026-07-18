import { createClient } from "@/lib/supabase/server";
import type { Masjid } from "@/types/database";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import ActiveToggle from "@/components/ActiveToggle";

export default async function MasjidsPage() {
  const supabase = await createClient();
  const { data: masjids } = await supabase
    .from("masjids")
    .select("*")
    .order("created_at", { ascending: false }) as { data: Masjid[] | null };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Masjids</h1>
        <Link
          href="/superadmin/masjids/new"
          className="flex items-center gap-2 bg-brand-green text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Masjid
        </Link>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {!masjids?.length ? (
          <div className="p-12 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No masjids yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {masjids.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        {m.masjid_code}
                      </span>
                      {!m.active && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{m.address}</p>
                    {m.phone && (
                      <p className="text-xs text-gray-400">{m.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2 sm:ml-4">
                  <ActiveToggle masjidId={m.id} active={m.active} />
                  <Link
                    href={`/superadmin/masjids/${m.id}/edit`}
                    className="text-sm text-brand-green hover:underline px-3 py-1.5 rounded-lg hover:bg-brand-green/5 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
