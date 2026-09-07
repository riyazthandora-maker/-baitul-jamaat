import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  default_amount: z.number().positive().optional(),
  description: z.string().max(255).trim().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();

  const { data: existing } = await adminSupabase
    .from("revenue_items")
    .select("id")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await adminSupabase
    .from("revenue_items")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
