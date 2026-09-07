import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validators/revenue-expense";
import { z } from "zod";

const patchSchema = contactSchema
  .partial()
  .extend({ is_active: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

// PATCH /api/admin/contacts/[id]
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
  const adminSupabase = await createAdminClient();

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existing } = await adminSupabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name     !== undefined) updates.name      = parsed.data.name;
  if (parsed.data.email    !== undefined) updates.email     = parsed.data.email || null;
  if (parsed.data.phone    !== undefined) updates.phone     = parsed.data.phone || null;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

  const { data: contact, error } = await adminSupabase
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "contacts",
    record_id: id,
    action: "update",
    after_data: contact,
  });

  return NextResponse.json({ contact });
}
