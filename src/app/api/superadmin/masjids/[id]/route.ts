import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Masjid } from "@/types/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow safe fields to be updated via PATCH
  const allowedFields = ["name", "address", "phone", "upi_id", "lat", "lng", "active"];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key];
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("masjids")
    .update(update)
    .eq("id", id)
    .select()
    .single() as { data: Masjid | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("masjids")
    .select("*")
    .eq("id", id)
    .single() as { data: Masjid | null; error: { message: string } | null };

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
