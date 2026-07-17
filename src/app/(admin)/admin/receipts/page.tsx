import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, FileText, Ban } from "lucide-react";

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*, members(full_name, member_number)")
    .eq("masjid_id", masjidId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Receipts</h1>
        <Link
          href="/admin/receipts/new"
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </Link>
      </div>

      {!receipts?.length ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          No receipts yet. Record a cash payment to generate the first receipt.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {receipts.map((r) => {
            const member = r.members as { full_name: string; member_number: string | null } | null;
            return (
              <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${r.voided_at ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{member?.full_name ?? "—"}</p>
                    {r.voided_at && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Voided
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {r.receipt_number} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <p className="font-semibold text-brand-green flex-shrink-0">
                  ₹{Number(r.amount).toFixed(0)}
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`/api/admin/receipts/${r.id}/pdf`}
                    target="_blank"
                    className="text-gray-400 hover:text-brand-green transition-colors"
                    title="Download PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
