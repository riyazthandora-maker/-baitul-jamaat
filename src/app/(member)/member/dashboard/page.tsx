import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import MemberSignOutButton from "@/components/MemberSignOutButton";
import UpiQrSection from "@/components/UpiQrSection";
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
    .select("id, member_number, full_name, status, phone, email")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, upi_id")
    .eq("id", masjidId)
    .maybeSingle();

  // Real outstanding balance
  const balance = member ? await getMemberBalance(supabase, member.id) : 0;

  // Recent ledger entries (last 5)
  const { data: recentEntries } = member
    ? await supabase
        .from("ledger")
        .select("id, created_at, type, amount, description")
        .eq("member_id", member.id)
        .is("voided_at", null)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  let upiQrDataUrl: string | null = null;
  if (masjid?.upi_id) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(masjid.upi_id)}&pn=${encodeURIComponent(masjid.name)}`;
    upiQrDataUrl = await QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 2,
      color: { dark: "#1a6b3c", light: "#ffffff" },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4 flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70">{masjid?.name}</p>
          <h1 className="text-xl font-bold">{member?.full_name ?? user.email}</h1>
          {member?.member_number && (
            <p className="text-sm font-mono opacity-80 mt-0.5">{member.member_number}</p>
          )}
        </div>
        <MemberSignOutButton />
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5 pb-12">
        {/* Balance Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-brand-green/20">
          <p className="text-sm text-gray-400 mb-1">Outstanding Balance</p>
          <p className={`text-4xl font-bold ${balance > 0 ? "text-red-600" : "text-brand-green"}`}>
            ₹{balance.toFixed(2)}
          </p>
          {balance <= 0 && (
            <p className="text-xs text-green-600 mt-2">All payments up to date</p>
          )}
        </div>

        {/* Recent Transactions */}
        {recentEntries && recentEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm">Recent Transactions</h2>
            <div className="divide-y text-sm">
              {recentEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 truncate">{e.description ?? e.type}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p
                    className={`font-semibold flex-shrink-0 ${
                      e.type === "charge" ? "text-red-500" : "text-brand-green"
                    }`}
                  >
                    {e.type === "charge" ? "+" : "−"} ₹{Number(e.amount).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pay Button / UPI QR */}
        {upiQrDataUrl && masjid?.upi_id ? (
          <UpiQrSection
            qrDataUrl={upiQrDataUrl}
            masjidName={masjid.name}
            upiId={masjid.upi_id}
          />
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
            Payment QR will appear here once your masjid adds a UPI ID
          </div>
        )}

        {/* Member details */}
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">My Information</h2>
          <dl className="space-y-2 text-sm">
            {member?.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Phone</dt>
                <dd className="font-medium">{member.phone}</dd>
              </div>
            )}
            {member?.email && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Email</dt>
                <dd className="font-medium">{member.email}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-400">Status</dt>
              <dd className="font-medium capitalize text-brand-green">
                {member?.status ?? "active"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
