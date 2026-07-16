import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, ChevronRight, UserPlus } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: {
    label: "Pending",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  active: {
    label: "Active",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  inactive: {
    label: "Inactive",
    color: "text-gray-500 bg-gray-50 border-gray-200",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("members")
    .select(
      "id, created_at, full_name, phone, status, member_number, duplicate_flag"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Members</h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link
            key={s}
            href={`/admin/members?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              status === s
                ? cfg.color
                : "text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cfg.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!members?.length ? (
          <div className="p-12 text-center text-gray-400">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {status} members.</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0 text-brand-green font-bold text-sm">
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{m.full_name}</p>
                      {m.member_number && (
                        <span className="text-xs text-gray-400 font-mono">
                          {m.member_number}
                        </span>
                      )}
                      {m.duplicate_flag === "possible_duplicate" && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Possible duplicate
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{m.phone}</p>
                    <p className="text-xs text-gray-300">
                      {new Date(m.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
