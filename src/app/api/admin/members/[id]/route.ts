import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Generate signed URL for ID doc if exists
  let idDocSignedUrl: string | null = null;
  let photoSignedUrl: string | null = null;

  if (member.id_doc_url) {
    const { data } = await adminSupabase.storage
      .from("member-documents")
      .createSignedUrl(member.id_doc_url, 3600);
    idDocSignedUrl = data?.signedUrl ?? null;
  }

  if (member.photo_url) {
    const { data } = await adminSupabase.storage
      .from("member-documents")
      .createSignedUrl(member.photo_url, 3600);
    photoSignedUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json({ member, idDocSignedUrl, photoSignedUrl });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowed = [
    "full_name",
    "phone",
    "email",
    "dob",
    "gender",
    "address",
    "id_type",
    "id_last4",
    "qualification",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }

  const { error } = await supabase.from("members").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
