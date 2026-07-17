import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AddMemberSchema = z.object({
  member_id: z.string().uuid(),
  relationship: z.enum(["head","husband","wife","son","daughter","father","mother","brother","sister","other"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: family_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata.masjid_id;

  const body = await request.json();
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("family_members")
    .insert({ family_id, member_id: parsed.data.member_id, relationship: parsed.data.relationship, masjid_id: masjidId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
