import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, FileText, Ban, Heart } from "lucide-react";
import VoidButton from "@/components/VoidButton";

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const [{ data: receipts }, { data: donations }] = await Promise.all([
    supabase
      .from("receipts")
      .select("*, members(full_name, member_number)")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("donations")
      .select("*")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <h1 className="text-2xl font-bold text-brand-green">Receipts & Donations</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/admin/donations/new"
            className="flex items-center justify-center gap-2 border border-brand-gold text-brand-gold px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-gold/5 transition-colors"
          >
            <Heart className="w-4 h-4" /> Record Donation
          </Link>
          <Link
            href="/admin/receipts/new"
            className="flex items-center justify-center gap-2 bg-brand-green text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </Link>
        </div>
      </div>

      {/* Member Receipts */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">Member Payments</h2>
        {!receipts?.length ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
            No member payments yet.
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
                      {r.receipt_number} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                      {r.notes && ` · ${r.notes}`}
                    </p>
                  </div>
                  <p className="font-semibold text-brand-green flex-shrink-0">
                    ₹{Number(r.amount).toFixed(0)}
                  </p>
                  <a
                    href={`/api/admin/receipts/${r.id}/pdf`}
                    target="_blank"
                    className="text-gray-400 hover:text-brand-green transition-colors flex-shrink-0"
                    title="Download PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                  {!r.voided_at && (
                    <VoidButton endpoint={`/api/admin/receipts/${r.id}/void`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Donations */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-600 text-sm uppercase tracking-wide">One-Time Donations</h2>
        {!donations?.length ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
            No donations recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {donations.map((d) => (
              <div key={d.id} className={`flex items-center gap-4 px-5 py-4 ${d.voided_at ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
                    <p className="font-medium text-sm">{d.donor_name}</p>
                    {d.voided_at && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Voided
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {d.receipt_number} · {new Date(d.created_at).toLocaleDateString("en-IN")}
                    {d.purpose && ` · ${d.purpose}`}
                    {d.donor_phone && ` · ${d.donor_phone}`}
                  </p>
                </div>
                <p className="font-semibold text-brand-gold flex-shrink-0">
                  ₹{Number(d.amount).toFixed(0)}
                </p>
                <a
                  href={`/api/admin/donations/${d.id}/pdf`}
                  target="_blank"
                  className="text-gray-400 hover:text-brand-gold transition-colors flex-shrink-0"
                  title="Download PDF"
                >
                  <FileText className="w-4 h-4" />
                </a>
                {!d.voided_at && (
                  <VoidButton endpoint={`/api/admin/donations/${d.id}/void`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
