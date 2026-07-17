import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import ApproveRejectButtons from "@/components/ApproveRejectButtons";

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
                <div key={label} className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="text-gray-800 font-medium break-words">
                    {value}
                  </dd>
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
        <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm">
          Status:{" "}
          <span className="font-medium capitalize">{member.status}</span>
          {member.member_number && (
            <span className="ml-2 font-mono text-brand-green">
              {member.member_number}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
