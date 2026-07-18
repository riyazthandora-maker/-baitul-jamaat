import MasjidForm from "@/components/MasjidForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import type { MasjidApplication } from "@/types/database";

export default async function NewMasjidPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const { applicationId } = await searchParams;

  let application: MasjidApplication | null = null;
  if (applicationId) {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("masjid_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle() as { data: MasjidApplication | null };
    application = data;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={applicationId ? "/superadmin/applications" : "/superadmin/masjids"}
          className="text-gray-400 hover:text-brand-green transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-green">New Masjid</h1>
          {application && (
            <p className="text-sm text-gray-500 mt-0.5">
              Pre-filled from application by{" "}
              <span className="font-medium text-gray-700">{application.email}</span>
            </p>
          )}
        </div>
      </div>
      <MasjidForm
        isNew
        applicationId={applicationId}
        prefillData={
          application
            ? {
                name: application.name,
                address: application.address,
                phone: application.phone,
                email: application.email,
              }
            : undefined
        }
      />
    </div>
  );
}
