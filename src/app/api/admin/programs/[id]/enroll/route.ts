import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrollSchema } from "@/lib/validators/program";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const rows = parsed.data.enrollments.map((e) => ({
    masjid_id: masjidId,
    program_id: programId,
    member_id: e.member_id,
    amount: e.amount,
  }));

  // Upsert — updates amount if already enrolled
  const { data, error } = await supabase
    .from("enrollments")
    .upsert(rows, { onConflict: "program_id,member_id" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrolled: data?.length ?? 0 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { member_id } = await request.json();
  if (!member_id) return NextResponse.json({ error: "member_id required" }, { status: 400 });

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("program_id", programId)
    .eq("member_id", member_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
