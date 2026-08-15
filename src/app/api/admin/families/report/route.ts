import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFamiliesReportPdf } from "@/lib/pdf";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata.masjid_id;

  const [{ data: masjid }, { data: families }, { data: allMembers }, { data: attachedIds }] =
    await Promise.all([
      supabase.from("masjids").select("name, address").eq("id", masjidId).single(),
      supabase
        .from("families")
        .select("name, family_members(relationship, member:members(full_name, member_number, phone))")
        .eq("masjid_id", masjidId)
        .order("name"),
      supabase
        .from("members")
        .select("id, full_name, member_number, phone")
        .eq("masjid_id", masjidId)
        .eq("status", "active")
        .order("full_name"),
      supabase.from("family_members").select("member_id").eq("masjid_id", masjidId),
    ]);

  if (!masjid || !families || !allMembers) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const attachedSet = new Set((attachedIds ?? []).map((r) => r.member_id));
  const unattachedMembers = allMembers.filter((m) => !attachedSet.has(m.id));

  type FamilyMemberRow = {
    relationship: string;
    member: { full_name: string; member_number: string | null; phone: string } | { full_name: string; member_number: string | null; phone: string }[] | null;
  };

  const familiesForPdf = families.map((f) => ({
    name: f.name,
    members: (f.family_members as unknown as FamilyMemberRow[])
      .map((fm) => {
        const m = Array.isArray(fm.member) ? fm.member[0] : fm.member;
        if (!m) return null;
        return { full_name: m.full_name, relationship: fm.relationship, member_number: m.member_number, phone: m.phone };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null),
  }));

  const pdfBytes = await generateFamiliesReportPdf({
    masjid,
    families: familiesForPdf,
    unattachedMembers: unattachedMembers.map((m) => ({
      full_name: m.full_name,
      member_number: m.member_number,
      phone: m.phone,
    })),
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="families-report-${date}.pdf"`,
    },
  });
}
