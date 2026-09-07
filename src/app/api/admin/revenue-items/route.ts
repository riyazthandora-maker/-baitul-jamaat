import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase().trim(),
  name: z.string().min(1).max(100).trim(),
  default_amount: z.number().positive(),
  description: z.string().max(255).trim().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;
  const activeOnly = request.nextUrl.searchParams.get("active") === "true";

  let query = supabase
    .from("revenue_items")
    .select("*")
    .eq("masjid_id", masjidId)
    .order("code", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("revenue_items")
    .insert({ masjid_id: masjidId, ...parsed.data })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `Code "${parsed.data.code}" already exists` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
