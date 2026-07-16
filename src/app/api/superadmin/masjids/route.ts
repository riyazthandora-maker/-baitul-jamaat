import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { masjidSchema } from "@/lib/validators/masjid";
import { generateTempPassword } from "@/lib/utils";
import type { Masjid } from "@/types/database";
import { ZodError } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("masjids")
    .select("*")
    .order("created_at", { ascending: false }) as { data: Masjid[] | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let validated: ReturnType<typeof masjidSchema.parse>;
  try {
    validated = masjidSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.errors.map((e) => e.message).join(", ") },
        { status: 422 }
      );
    }
    throw err;
  }

  // Check masjid_code uniqueness
  const { data: existing } = await supabase
    .from("masjids")
    .select("id")
    .eq("masjid_code", validated.masjid_code)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) {
    return NextResponse.json(
      { error: "This masjid code is already taken." },
      { status: 409 }
    );
  }

  // Create masjid row
  const { data: masjid, error: masjidError } = await supabase
    .from("masjids")
    .insert({
      name: validated.name,
      address: validated.address,
      phone: validated.phone,
      masjid_code: validated.masjid_code,
      upi_id: validated.upi_id || null,
      lat: validated.lat ?? null,
      lng: validated.lng ?? null,
      active: validated.active,
    })
    .select()
    .single() as { data: Masjid | null; error: { message: string } | null };

  if (masjidError || !masjid) {
    return NextResponse.json(
      { error: masjidError?.message ?? "Failed to create masjid" },
      { status: 500 }
    );
  }

  // Create masjid admin Supabase Auth user
  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tempPassword = generateTempPassword();
  const emailAlias = `${validated.admin_phone}@bj.local`;

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: emailAlias,
    password: tempPassword,
    email_confirm: true,
    app_metadata: {
      role: "masjid_admin",
      masjid_id: masjid.id,
      force_password_change: true,
    },
    user_metadata: {
      full_name: validated.admin_name,
      phone: validated.admin_phone,
    },
  });

  if (authError || !authUser.user) {
    // Rollback masjid creation
    await supabase.from("masjids").delete().eq("id", masjid.id);
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create admin account" },
      { status: 500 }
    );
  }

  // Create profile row
  await supabase.from("profiles").insert({
    id: authUser.user.id,
    masjid_id: masjid.id,
    role: "masjid_admin",
    full_name: validated.admin_name,
    phone: validated.admin_phone,
    force_password_change: true,
  });

  return NextResponse.json({
    masjid,
    credentials: {
      phone: validated.admin_phone,
      password: tempPassword,
      masjidName: masjid.name,
    },
  });
}
