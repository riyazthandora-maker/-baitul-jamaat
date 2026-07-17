import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { headers } from "next/headers";
import Link from "next/link";
import { Users, Clock, QrCode, Mail, Download, TrendingUp, Receipt } from "lucide-react";
import QrDownloadButton from "@/components/QrDownloadButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import OutstandingBalanceCard from "@/components/OutstandingBalanceCard";

function OutstandingBalanceSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm p-5 border border-gray-100 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-40" />
        <div className="h-7 bg-gray-200 rounded w-28" />
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const { data: masjid } = await supabase
    .from("masjids")
    .select("name, masjid_code, upi_id")
    .eq("id", masjidId)
    .maybeSingle();

  const [{ count: pendingCount }, { count: activeCount }] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (host.includes("localhost") ? `http://${host}` : `https://${host}`);
  const registrationUrl = `${appUrl}/masjids/${masjid?.masjid_code}/register`;

  const qrDataUrl = masjid
    ? await QRCode.toDataURL(registrationUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#1a6b3c", light: "#ffffff" },
      })
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-green">
        {masjid?.name ?? "Dashboard"}
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/members?status=pending"
          className="bg-white rounded-xl shadow-sm p-5 border border-amber-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-3xl font-bold text-amber-600">
                {pendingCount ?? 0}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/members?status=active"
          className="bg-white rounded-xl shadow-sm p-5 border border-green-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-green" />
            <div>
              <p className="text-3xl font-bold text-brand-green">
                {activeCount ?? 0}
              </p>
              <p className="text-sm text-gray-500">Active Members</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Outstanding balance — streams in independently */}
      <Suspense fallback={<OutstandingBalanceSkeleton />}>
        <OutstandingBalanceCard masjidId={masjidId} />
      </Suspense>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/programs"
          className="bg-white rounded-xl shadow-sm p-4 border border-brand-green/10 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <TrendingUp className="w-8 h-8 text-brand-green" />
          <div>
            <p className="font-semibold text-gray-800">Programs</p>
            <p className="text-xs text-gray-400">Manage billing programs</p>
          </div>
        </Link>
        <Link
          href="/admin/receipts"
          className="bg-white rounded-xl shadow-sm p-4 border border-brand-gold/20 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <Receipt className="w-8 h-8 text-brand-gold" />
          <div>
            <p className="font-semibold text-gray-800">Receipts</p>
            <p className="text-xs text-gray-400">Record payments</p>
          </div>
        </Link>
      </div>

      {/* Statement download */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-700">Monthly Statement</p>
          <p className="text-sm text-gray-400">Download current month&apos;s outstanding PDF</p>
        </div>
        <a
          href="/api/admin/statements"
          target="_blank"
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      </div>

      {qrDataUrl && masjid && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-brand-green" />
            Registration QR Code
          </h2>
          <p className="text-sm text-gray-500">
            Members scan this to register with your masjid
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 bg-white border-2 border-gray-200 rounded-xl p-3">
              <img
                src={qrDataUrl}
                alt="Registration QR Code"
                width={200}
                height={200}
                className="block"
              />
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <p className="text-xs text-gray-400 mb-1">Registration link</p>
                <p className="text-sm text-brand-green font-mono break-all bg-gray-50 rounded-lg p-2">
                  {registrationUrl}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <QrDownloadButton
                  qrDataUrl={qrDataUrl}
                  masjidCode={masjid.masjid_code}
                />
                <CopyLinkButton url={registrationUrl} />
                <a
                  href={`mailto:?subject=Join ${masjid.name}&body=Register as a member of ${masjid.name}: ${registrationUrl}`}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Link
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
