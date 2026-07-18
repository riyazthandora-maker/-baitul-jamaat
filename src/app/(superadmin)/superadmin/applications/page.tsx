import { createClient } from "@/lib/supabase/server";
import type { MasjidApplication } from "@/types/database";
import Link from "next/link";
import { ClipboardList, Building2 } from "lucide-react";
import ApplicationActions from "@/components/ApplicationActions";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("masjid_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterStatus && ["pending", "approved", "rejected"].includes(filterStatus)) {
    query = query.eq("status", filterStatus);
  }

  const { data: applications } = await query as { data: MasjidApplication[] | null };

  const tabs = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  const activeTab = filterStatus ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-green">Masjid Applications</h1>
          <p className="text-gray-500 mt-1">Review and act on registration requests</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/superadmin/applications?status=${tab.value}` : "/superadmin/applications"}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.value
                ? "border-brand-green text-brand-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {!applications?.length ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-5 py-3.5 font-semibold text-gray-600">Masjid</th>
                  <th className="px-5 py-3.5 font-semibold text-gray-600 hidden md:table-cell">Contact</th>
                  <th className="px-5 py-3.5 font-semibold text-gray-600 hidden lg:table-cell">Submitted</th>
                  <th className="px-5 py-3.5 font-semibold text-gray-600">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{app.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-gray-700">{app.email}</p>
                      <p className="text-xs text-gray-400">{app.phone}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-gray-500">
                      {new Date(app.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {app.status === "pending" ? (
                        <ApplicationActions applicationId={app.id} />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {app.reviewed_at
                            ? new Date(app.reviewed_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MasjidApplication["status"] }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
