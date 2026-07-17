import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Download } from "lucide-react";
import ProgramActions from "@/components/ProgramActions";
import UnenrollButton from "@/components/UnenrollButton";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*, enrollments(id, amount, member_id, members(id, full_name, member_number, phone, status))")
    .eq("id", id)
    .maybeSingle();

  if (!program) notFound();

  type EnrollmentRow = {
    id: string;
    amount: number;
    member_id: string;
    members: { id: string; full_name: string; member_number: string | null; phone: string; status: string };
  };

  const enrollments = (program.enrollments as unknown as EnrollmentRow[]) ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/programs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green truncate">{program.name}</h1>
        <span
          className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            program.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {program.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Program info */}
      <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Default Amount</p>
          <p className="font-semibold">₹{Number(program.default_amount).toFixed(0)}</p>
        </div>
        <div>
          <p className="text-gray-400">Billing</p>
          <p className="font-semibold capitalize">{program.recurrence}</p>
        </div>
        <div>
          <p className="text-gray-400">Starts</p>
          <p className="font-semibold">{new Date(program.start_date).toLocaleDateString("en-IN")}</p>
        </div>
        <div>
          <p className="text-gray-400">Ends</p>
          <p className="font-semibold">
            {program.end_date ? new Date(program.end_date).toLocaleDateString("en-IN") : "—"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <ProgramActions programId={program.id} active={program.active} />

      {/* Enrollments */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-green" />
            Enrolled Members ({enrollments.length})
          </h2>
          <Link
            href={`/admin/programs/${id}/enroll`}
            className="flex items-center gap-1.5 text-sm bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            + Enroll Members
          </Link>
        </div>

        {!enrollments.length ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No members enrolled yet. Click "Enroll Members" to add.
          </p>
        ) : (
          <div className="divide-y">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.members.full_name}</p>
                  <p className="text-xs text-gray-400">{e.members.member_number ?? e.members.phone}</p>
                </div>
                <p className="font-semibold text-brand-green text-sm flex-shrink-0">
                  ₹{Number(e.amount).toFixed(0)}
                </p>
                <Link
                  href={`/admin/members/${e.members.id}?tab=ledger`}
                  className="text-xs text-gray-400 hover:text-brand-green flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                </Link>
                <UnenrollButton programId={program.id} memberId={e.member_id} memberName={e.members.full_name} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
