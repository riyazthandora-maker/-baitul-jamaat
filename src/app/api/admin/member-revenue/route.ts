import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  member_id: z.string().uuid(),
  revenue_item_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  amount: z.number().positive(),
  description: z.string().max(255).trim().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();
  const { data: entry, error } = await adminSupabase.rpc("record_member_revenue", {
    p_masjid_id:       masjidId,
    p_actor_id:        user.id,
    p_member_id:       parsed.data.member_id,
    p_revenue_item_id: parsed.data.revenue_item_id,
    p_date:            parsed.data.date,
    p_amount:          parsed.data.amount,
    p_description:     parsed.data.description ?? null,
  });

  if (error || !entry) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to record charge" },
      { status: 400 }
    );
  }

  return NextResponse.json({ entry }, { status: 201 });
}
