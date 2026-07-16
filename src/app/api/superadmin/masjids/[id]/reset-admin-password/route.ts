import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { generateTempPassword } from "@/lib/utils";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [masjidRes, profileRes] = await Promise.all([
    supabase.from("masjids").select("name").eq("id", id).single(),
    supabase
      .from("profiles")
      .select("id, phone")
      .eq("masjid_id", id)
      .eq("role", "masjid_admin")
      .single(),
  ]);
  const masjid = masjidRes.data as { name: string } | null;
  const profile = profileRes.data as { id: string; phone: string } | null;

  if (!masjid) {
    return NextResponse.json({ error: "Masjid not found" }, { status: 404 });
  }
  if (!profile) {
    return NextResponse.json(
      { error: "No admin account found for this masjid" },
      { status: 404 }
    );
  }

  const tempPassword = generateTempPassword();

  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    profile.id,
    { password: tempPassword }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({ force_password_change: true })
    .eq("id", profile.id);

  return NextResponse.json({
    credentials: {
      phone: profile.phone,
      password: tempPassword,
      masjidName: masjid.name,
    },
  });
}
