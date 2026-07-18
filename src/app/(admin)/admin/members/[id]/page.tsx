import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Receipt, TrendingDown, FileText } from "lucide-react";
import ApproveRejectButtons from "@/components/ApproveRejectButtons";
import VoidButton from "@/components/VoidButton";
import AddDiscountForm from "@/components/AddDiscountForm";
import OpeningBalanceForm from "@/components/OpeningBalanceForm";
import StatementActions from "@/components/StatementActions";
import LedgerList from "@/components/LedgerList";
import MemberStatusToggle from "@/components/MemberStatusToggle";
import MemberResetPasswordButton from "@/components/MemberResetPasswordButton";

export default async function MemberReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!member) notFound();

  // Get signed URLs for documents
  let idDocSignedUrl: string | null = null;
  let idDocBackSignedUrl: string | null = null;
  let photoSignedUrl: string | null = null;

  const signUrl = async (path: string) => {
    const { data } = await adminSupabase.storage
      .from("member-documents")
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  if (member.id_doc_url) idDocSignedUrl = await signUrl(member.id_doc_url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((member as any).id_doc_back_url) idDocBackSignedUrl = await signUrl((member as any).id_doc_back_url);
  if (member.photo_url) photoSignedUrl = await signUrl(member.photo_url);

  // Ledger entries for this member
  const { data: ledgerEntries } = await supabase
    .from("ledger")
    .select("*, programs(name)")
    .eq("member_id", id)
    .order("created_at", { ascending: false });

  const activeEntries = (ledgerEntries ?? []).filter((e) => !e.voided_at);
  const balance = activeEntries.reduce((sum, e) => {
    return (e.type === "charge" || e.type === "opening_balance") ? sum + Number(e.amount) : sum - Number(e.amount);
  }, 0);
  const openingBalance = activeEntries.find((e) => e.type === "opening_balance");
  const currentOpeningBalance = openingBalance ? Number(openingBalance.amount) : 0;

  // Receipts for this member
  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
    .eq("member_id", id)
    .order("created_at", { ascending: false });

  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Full Name", value: member.full_name },
    { label: "Phone", value: member.phone },
    { label: "Email", value: member.email },
    {
      label: "Date of Birth",
      value: member.dob
        ? new Date(member.dob).toLocaleDateString("en-IN")
        : null,
    },
    { label: "Gender", value: member.gender },
    { label: "Address", value: member.address },
    { label: "ID Type", value: member.id_type },
    { label: "Last 4 Digits", value: member.id_last4 },
    { label: "Qualification", value: member.qualification },
    {
      label: "Submitted",
      value: new Date(member.created_at).toLocaleString("en-IN"),
    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/members"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">
          Review Application
        </h1>
      </div>

      {member.duplicate_flag === "possible_duplicate" && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Possible Duplicate</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {member.duplicate_reason ??
                "Similar name found in existing records."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Member Data */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">
            Submitted Information
          </h2>

          {photoSignedUrl && (
            <div className="flex justify-center pb-2">
              <img
                src={photoSignedUrl}
                alt="Member photo"
                className="w-24 h-24 rounded-full object-cover border-2 border-brand-green/30"
              />
            </div>
          )}

          <dl className="space-y-3">
            {fields.map(({ label, value }) =>
              value ? (
                <div key={label} className="text-sm">
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
                  <dd className="text-gray-800 font-medium break-words">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>

        {/* Right: Document Images */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 border-b pb-2">
            Uploaded Document
          </h2>
          {idDocSignedUrl ? (
            <div className="space-y-4">
              {/* Front */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Front</p>
                {idDocSignedUrl.toLowerCase().includes(".pdf") ? (
                  <a
                    href={idDocSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Open PDF (Front)
                  </a>
                ) : (
                  <img
                    src={idDocSignedUrl}
                    alt="ID Document Front"
                    className="w-full rounded-lg border border-gray-200 object-contain max-h-64"
                  />
                )}
              </div>
              {/* Back (if present) */}
              {idDocBackSignedUrl && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Back</p>
                  {idDocBackSignedUrl.toLowerCase().includes(".pdf") ? (
                    <a
                      href={idDocBackSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-brand-green text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Open PDF (Back)
                    </a>
                  ) : (
                    <img
                      src={idDocBackSignedUrl}
                      alt="ID Document Back"
                      className="w-full rounded-lg border border-gray-200 object-contain max-h-64"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No document uploaded</p>
          )}
        </div>
      </div>

      {/* Approve / Reject (only for pending) */}
      {member.status === "pending" && (
        <ApproveRejectButtons
          memberId={id}
          memberName={member.full_name}
        />
      )}

      {member.status !== "pending" && (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-gray-500 text-sm">
            Status:{" "}
            <span className="font-medium capitalize">{member.status}</span>
            {member.member_number && (
              <span className="ml-2 font-mono text-brand-green">
                {member.member_number}
              </span>
            )}
          </div>
          {(member.status === "active" || member.status === "inactive") && (
            <MemberStatusToggle
              memberId={id}
              currentStatus={member.status}
            />
          )}
        </div>
      )}

      {/* Balance summary */}
      {member.status === "active" && (
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-sm">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-brand-green"}`}>
              ₹{balance.toFixed(2)}
            </p>
          </div>
          <Link
            href={`/admin/receipts/new?member_id=${id}`}
            className="flex items-center gap-1.5 bg-brand-green text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            <Receipt className="w-4 h-4" /> Record Payment
          </Link>
        </div>
      )}

      {/* Add discount */}
      {member.status === "active" && (
        <AddDiscountForm memberId={id} />
      )}

      {/* Opening balance for data migration */}
      {member.status === "active" && (
        <OpeningBalanceForm memberId={id} currentBalance={currentOpeningBalance} />
      )}

      {/* Reset member password */}
      {member.status === "active" && member.profile_id && (
        <MemberResetPasswordButton memberId={id} />
      )}

      {/* Ledger */}
      {ledgerEntries && ledgerEntries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-brand-green" /> Ledger
            </h2>
            <StatementActions memberId={id} memberEmail={member.email} />
          </div>
          <LedgerList
            entries={(ledgerEntries ?? []).map((e) => ({
              ...e,
              programs: (e.programs as { name: string } | null),
            }))}
          />
        </div>
      )}

      {/* Receipts */}
      {receipts && receipts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-green" /> Receipts
          </h2>
          <div className="divide-y text-sm">
            {receipts.map((r) => (
              <div key={r.id} className={`flex items-center gap-3 py-2.5 ${r.voided_at ? "opacity-40" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.receipt_number}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                    {r.notes && ` — ${r.notes}`}
                    {r.void_reason && ` — voided: ${r.void_reason}`}
                  </p>
                </div>
                <p className="font-semibold text-brand-green flex-shrink-0">
                  ₹{Number(r.amount).toFixed(0)}
                </p>
                <a
                  href={`/api/admin/receipts/${r.id}/pdf`}
                  target="_blank"
                  className="text-gray-400 hover:text-brand-green flex-shrink-0"
                >
                  <FileText className="w-4 h-4" />
                </a>
                {!r.voided_at && (
                  <VoidButton endpoint={`/api/admin/receipts/${r.id}/void`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
