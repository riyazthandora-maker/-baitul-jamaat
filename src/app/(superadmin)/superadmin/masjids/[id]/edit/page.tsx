import { createClient } from "@/lib/supabase/server";
import type { Masjid } from "@/types/database";
import { notFound } from "next/navigation";
import MasjidForm from "@/components/MasjidForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function EditMasjidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: masjid } = await supabase
    .from("masjids")
    .select("*")
    .eq("id", id)
    .single() as { data: Masjid | null };

  if (!masjid) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/masjids"
          className="text-gray-400 hover:text-brand-green transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">
          Edit — {masjid.name}
        </h1>
      </div>
      <MasjidForm initialData={masjid} isNew={false} />
    </div>
  );
}
