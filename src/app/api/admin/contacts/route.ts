import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validators/revenue-expense";

// GET /api/admin/contacts?q=term&include_inactive=true
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const includeInactive = request.nextUrl.searchParams.get("include_inactive") === "true";

  let query = (await createAdminClient())
    .from("contacts")
    .select("id, name, email, phone, is_active")
    .eq("masjid_id", masjidId)
    .order("name", { ascending: true })
    .limit(50);

  if (!includeInactive) query = query.eq("is_active", true);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

// POST /api/admin/contacts
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const adminSupabase = await createAdminClient();

  const { data: contact, error } = await adminSupabase
    .from("contacts")
    .insert({
      masjid_id: masjidId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminSupabase.from("audit_log").insert({
    masjid_id: masjidId,
    actor_id: user.id,
    table_name: "contacts",
    record_id: contact.id,
    action: "insert",
    after_data: contact,
  });

  return NextResponse.json({ contact }, { status: 201 });
}
