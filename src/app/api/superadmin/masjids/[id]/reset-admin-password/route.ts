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

  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get masjid name + find the admin user from auth.users (source of truth)
  const [masjidRes, usersRes] = await Promise.all([
    supabase.from("masjids").select("name").eq("id", id).single(),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const masjid = masjidRes.data as { name: string } | null;
  if (!masjid) {
    return NextResponse.json({ error: "Masjid not found" }, { status: 404 });
  }

  // Find the masjid_admin for this masjid directly from auth.users app_metadata
  const adminUser = usersRes.data?.users?.find(
    (u) =>
      u.app_metadata?.masjid_id === id &&
      u.app_metadata?.role === "masjid_admin"
  );

  if (!adminUser) {
    return NextResponse.json(
      {
        error:
          "No admin account found for this masjid. The admin may not have been created successfully — try creating a new masjid or contact support.",
      },
      { status: 404 }
    );
  }

  const tempPassword = generateTempPassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    adminUser.id,
    { password: tempPassword, app_metadata: { force_password_change: true } }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Best-effort: mark force_password_change on the profile if it exists
  await supabase
    .from("profiles")
    .update({ force_password_change: true })
    .eq("id", adminUser.id);

  // Phone comes from user_metadata (set at creation time)
  const phone =
    (adminUser.user_metadata?.phone as string | undefined) ??
    adminUser.email?.replace("@bj.local", "") ??
    "—";

  return NextResponse.json({
    credentials: {
      phone,
      password: tempPassword,
      masjidName: masjid.name,
    },
  });
}
