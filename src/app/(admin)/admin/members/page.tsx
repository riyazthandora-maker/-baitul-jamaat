import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, ChevronRight, UserPlus, ArrowUpDown, FileUp } from "lucide-react";
import { Suspense } from "react";
import MemberSearch from "@/components/MemberSearch";

const PAGE_SIZE = 50;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200" },
  active: { label: "Active", color: "text-green-700 bg-green-50 border-green-200" },
  inactive: { label: "Inactive", color: "text-gray-500 bg-gray-50 border-gray-200" },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50 border-red-200" },
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; sort?: string }>;
}) {
  const { status = "pending", q = "", page = "1", sort = "newest" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const supabase = await createClient();

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("members")
    .select("id, created_at, full_name, phone, status, member_number, duplicate_flag", { count: "exact" })
    .eq("status", status);

  if (q.trim()) {
    query = query.or(
      `full_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%,member_number.ilike.%${q.trim()}%`
    );
  }

  query = sort === "name"
    ? query.order("full_name", { ascending: true })
    : query.order("created_at", { ascending: false });

  const { data: members, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Scope ledger query to only the members on this page (active tab only)
  const memberIds = (members ?? []).map((m) => m.id);
  const balanceMap = new Map<string, number>();

  if (status === "active" && memberIds.length > 0) {
    const { data: ledgerRows } = await supabase
      .from("ledger")
      .select("member_id, type, amount")
      .in("member_id", memberIds)
      .is("voided_at", null);

    for (const e of ledgerRows ?? []) {
      const prev = balanceMap.get(e.member_id) ?? 0;
      balanceMap.set(e.member_id, (e.type === "charge" || e.type === "opening_balance") ? prev + Number(e.amount) : prev - Number(e.amount));
    }
  }

  // Build URL helper that preserves current params
  function pageUrl(p: number) {
    const params = new URLSearchParams({ status, page: String(p), sort });
    if (q) params.set("q", q);
    return `/admin/members?${params.toString()}`;
  }

  function sortUrl(s: string) {
    const params = new URLSearchParams({ status, page: "1", sort: s });
    if (q) params.set("q", q);
    return `/admin/members?${params.toString()}`;
  }

  const showingFrom = count === 0 ? 0 : from + 1;
  const showingTo = Math.min(to + 1, count ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Members</h1>
        <Link
          href="/admin/members/import"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-green text-white text-sm font-semibold hover:bg-green-800 transition-colors"
        >
          <FileUp className="w-4 h-4" />
          Import Members
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <Link
            key={s}
            href={`/admin/members?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              status === s ? cfg.color : "text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cfg.label}
          </Link>
        ))}
      </div>

      {/* Search + sort bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Suspense>
          <MemberSearch />
        </Suspense>
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <Link
            href={sortUrl("newest")}
            className={`text-sm px-2 py-1 rounded ${sort === "newest" || sort === "" ? "text-brand-green font-medium" : "text-gray-400 hover:text-gray-600"}`}
          >
            Newest
          </Link>
          <span className="text-gray-200">|</span>
          <Link
            href={sortUrl("name")}
            className={`text-sm px-2 py-1 rounded ${sort === "name" ? "text-brand-green font-medium" : "text-gray-400 hover:text-gray-600"}`}
          >
            A–Z
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {!members?.length ? (
          <div className="p-12 text-center text-gray-400">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{q ? `No results for "${q}"` : `No ${status} members.`}</p>
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
                        <span className="text-xs text-gray-400 font-mono">{m.member_number}</span>
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
                <div className="flex items-center gap-3 flex-shrink-0">
                  {balanceMap.has(m.id) && (
                    <span className={`text-sm font-semibold ${(balanceMap.get(m.id) ?? 0) > 0 ? "text-red-600" : "text-brand-green"}`}>
                      ₹{Math.abs(balanceMap.get(m.id) ?? 0).toLocaleString("en-IN")}
                      {(balanceMap.get(m.id) ?? 0) > 0 && (
                        <span className="text-xs font-normal text-red-400 ml-1">due</span>
                      )}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(count ?? 0) > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {showingFrom}–{showingTo} of {count}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={pageUrl(currentPage - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Prev
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
                ← Prev
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={pageUrl(currentPage + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
