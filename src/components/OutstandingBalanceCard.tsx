import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default async function OutstandingBalanceCard({ masjidId }: { masjidId: string }) {
  const supabase = await createClient();
  const { data: ledgerRows } = await supabase
    .from("ledger")
    .select("type, amount")
    .eq("masjid_id", masjidId)
    .is("voided_at", null);

  const total = (ledgerRows ?? []).reduce((sum, e) => {
    return e.type === "charge" ? sum + Number(e.amount) : sum - Number(e.amount);
  }, 0);

  return (
    <Link
      href="/admin/members?status=active"
      className={`flex items-center gap-4 bg-white rounded-xl shadow-sm p-5 border hover:shadow-md transition-shadow ${
        total > 0 ? "border-red-100" : "border-green-100"
      }`}
    >
      <AlertCircle className={`w-8 h-8 flex-shrink-0 ${total > 0 ? "text-red-500" : "text-brand-green"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">Total Outstanding Balance</p>
        <p className={`text-2xl font-bold ${total > 0 ? "text-red-600" : "text-brand-green"}`}>
          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>
      <p className="text-xs text-gray-400 flex-shrink-0">View members →</p>
    </Link>
  );
}
