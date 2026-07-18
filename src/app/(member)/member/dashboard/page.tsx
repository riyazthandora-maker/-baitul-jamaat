import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import MemberSignOutButton from "@/components/MemberSignOutButton";
import PayButton from "@/components/PayButton";
import { getMemberBalance } from "@/lib/billing";

export default async function MemberDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") redirect("/login");

  const masjidId = user.app_metadata?.masjid_id as string;

  const { data: member } = await supabase
    .from("members")
    .select("id, member_number, full_name, status, phone, email, created_at")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, upi_id")
    .eq("id", masjidId)
    .maybeSingle();

  const balance = member ? await getMemberBalance(supabase, member.id) : 0;

  const { data: recentEntries } = member
    ? await supabase
        .from("ledger")
        .select("id, created_at, type, amount, description")
        .eq("member_id", member.id)
        .is("voided_at", null)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  // Generate QR with amount pre-filled for PayButton
  let payQrDataUrl: string | null = null;
  if (masjid?.upi_id && balance > 0) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(masjid.upi_id)}&pn=${encodeURIComponent(masjid.name)}&am=${balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Outstanding Dues")}`;
    payQrDataUrl = await QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 2,
      color: { dark: "#1a6b3c", light: "#ffffff" },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="brand-gradient text-white py-5 px-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70 uppercase tracking-wide">{masjid?.name}</p>
          <h1 className="text-xl font-bold mt-0.5">{member?.full_name ?? "Member"}</h1>
          {member?.member_number && (
            <p className="text-sm font-mono opacity-80 mt-0.5 tracking-wider">
              {member.member_number}
            </p>
          )}
        </div>
        <MemberSignOutButton />
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-12">

        {/* Balance Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-brand-green/20">
          <p className="text-sm text-gray-400 mb-1">Outstanding Balance</p>
          <p className={`text-5xl font-bold ${balance > 0 ? "text-red-600" : "text-brand-green"}`}>
            ₹{balance.toFixed(2)}
          </p>
          {balance <= 0 ? (
            <p className="text-sm text-green-600 mt-2 font-medium">All payments up to date ✓</p>
          ) : (
            <p className="text-xs text-gray-400 mt-2">Please pay at the earliest convenience</p>
          )}
        </div>

        {/* Pay Button (only when balance > 0 and UPI configured) */}
        {balance > 0 && masjid?.upi_id && payQrDataUrl && (
          <PayButton
            upiId={masjid.upi_id}
            masjidName={masjid.name}
            balance={balance}
            qrDataUrl={payQrDataUrl}
          />
        )}

        {/* No UPI configured nudge */}
        {balance > 0 && !masjid?.upi_id && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-center">
            Contact your masjid to set up online payment
          </div>
        )}

        {/* Recent Transactions */}
        {recentEntries && recentEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              Recent Transactions
            </h2>
            <div className="divide-y text-sm">
              {recentEntries.map((e) => {
                const isDebit = e.type === "charge" || e.type === "opening_balance";
                return (
                  <div key={e.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate">
                        {e.description ?? (e.type === "opening_balance" ? "Opening balance" : e.type)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(e.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className={`font-semibold flex-shrink-0 ${isDebit ? "text-red-500" : "text-brand-green"}`}>
                      {isDebit ? "+" : "−"} ₹{Number(e.amount).toFixed(0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Member Details */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            My Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Member ID</dt>
              <dd className="font-mono font-semibold text-brand-green mt-0.5">
                {member?.member_number ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Full Name</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{member?.full_name ?? "—"}</dd>
            </div>
            {member?.phone && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Phone</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{member.phone}</dd>
              </div>
            )}
            {member?.email && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
                <dd className="font-medium text-gray-800 mt-0.5 break-all">{member.email}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Masjid</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{masjid?.name ?? "—"}</dd>
            </div>
            {member?.created_at && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Member Since</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {new Date(member.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>

      </div>
    </div>
  );
}
