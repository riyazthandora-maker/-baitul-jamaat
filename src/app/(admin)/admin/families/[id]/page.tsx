import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FamilyDetail from "./FamilyDetail";

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const masjidId = user?.app_metadata?.masjid_id;

  const { data: family } = await supabase
    .from("families")
    .select("*, family_members(id, member_id, relationship, member:members(id, full_name, dob, gender, photo_url, member_number))")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .single();

  if (!family) notFound();

  // Fetch active members for add-member dropdown
  const { data: allMembers } = await supabase
    .from("members")
    .select("id, full_name, member_number")
    .eq("status", "active")
    .eq("masjid_id", masjidId)
    .order("full_name");

  const existingMemberIds = new Set((family.family_members as Array<{member_id: string}>).map((fm) => fm.member_id));
  const availableMembers = (allMembers ?? []).filter((m) => !existingMemberIds.has(m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/families" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">{family.name}</h1>
      </div>
      <FamilyDetail family={family as any} availableMembers={availableMembers ?? []} />
    </div>
  );
}
