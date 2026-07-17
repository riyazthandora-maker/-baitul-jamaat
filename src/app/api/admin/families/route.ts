import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateFamilySchema = z.object({
  name: z.string().min(1).max(100),
  head_member_id: z.string().uuid(),
  members: z.array(z.object({
    member_id: z.string().uuid(),
    relationship: z.enum(["head","husband","wife","son","daughter","father","mother","brother","sister","other"]),
  })).min(1),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata.masjid_id;

  const { data: families, error } = await supabase
    .from("families")
    .select("id, name, head_member_id, created_at, members:family_members(id, member_id, relationship, member:members(full_name))")
    .eq("masjid_id", masjidId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ families });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata.masjid_id;

  const body = await request.json();
  const parsed = CreateFamilySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, head_member_id, members } = parsed.data;

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name, head_member_id, masjid_id: masjidId })
    .select()
    .single();

  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message ?? "Failed to create family" }, { status: 500 });
  }

  const memberRows = members.map((m) => ({
    family_id: family.id,
    member_id: m.member_id,
    relationship: m.relationship,
    masjid_id: masjidId,
  }));

  const { error: memberError } = await supabase.from("family_members").insert(memberRows);
  if (memberError) {
    await supabase.from("families").delete().eq("id", family.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ family }, { status: 201 });
}
