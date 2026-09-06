import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  revenueExpenseUpdateSchema,
  isWithin60DayWindow,
} from "@/lib/validators/revenue-expense";

// PATCH /api/admin/revenue-expenses/[id]
// Allows updating operational metadata only: remarks, date.
// Financial fields (amount, type, entity, is_received, is_paid) are immutable.
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
  const parsed = revenueExpenseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const adminSupabase = await createAdminClient();

  const { data: existing } = await adminSupabase
    .from("revenue_expenses")
    .select("*")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Validate new date if provided
  if (parsed.data.date && !isWithin60DayWindow(parsed.data.date)) {
    return NextResponse.json(
      { error: "Date must be within 30 days before or after today" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if ("remarks" in parsed.data) updates.remarks = parsed.data.remarks ?? null;
  if (parsed.data.date) updates.date = parsed.data.date;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: updated, error } = await adminSupabase
    .from("revenue_expenses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "revenue_expenses",
    record_id: id,
    action: "update",
    before_data: existing,
    after_data: updated,
  });

  return NextResponse.json({ entry: updated });
}

// DELETE /api/admin/revenue-expenses/[id]  — soft delete only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const adminSupabase = await createAdminClient();

  const { data: existing } = await adminSupabase
    .from("revenue_expenses")
    .select("*")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const { error } = await adminSupabase
    .from("revenue_expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "revenue_expenses",
    record_id: id,
    action: "soft_delete",
    before_data: existing,
  });

  return NextResponse.json({ success: true });
}
