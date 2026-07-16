import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import MemberSignOutButton from "@/components/MemberSignOutButton";
import UpiQrSection from "@/components/UpiQrSection";

export default async function MemberDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") redirect("/login");

  const masjidId = user.app_metadata?.masjid_id as string;

  // Get member record
  const { data: member } = await supabase
    .from("members")
    .select("member_number, full_name, status, phone, email")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Get masjid for UPI QR
  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, upi_id")
    .eq("id", masjidId)
    .maybeSingle();

  // Generate UPI QR if masjid has UPI ID
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
      {/* Header */}
      <div className="brand-gradient text-white py-5 px-4 flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70">{masjid?.name}</p>
          <h1 className="text-xl font-bold">
            {member?.full_name ?? user.email}
          </h1>
          {member?.member_number && (
            <p className="text-sm font-mono opacity-80 mt-0.5">
              {member.member_number}
            </p>
          )}
        </div>
        <MemberSignOutButton />
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5 pb-12">
        {/* Balance Card (placeholder for Step 6) */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-brand-green/20">
          <p className="text-sm text-gray-400 mb-1">Outstanding Balance</p>
          <p className="text-4xl font-bold text-brand-green">₹0.00</p>
          <p className="text-xs text-gray-300 mt-2">
            Billing starts when programs are added
          </p>
        </div>

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
