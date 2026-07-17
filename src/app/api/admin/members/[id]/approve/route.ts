import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;

  // Get the member record
  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json(
      { error: "Pending member not found" },
      { status: 404 }
    );
  }

  // Generate member number atomically
  const { data: memberNum, error: numErr } = await adminSupabase.rpc(
    "next_member_number",
    { p_masjid_id: masjidId }
  );

  if (numErr || !memberNum) {
    return NextResponse.json(
      { error: "Failed to generate member number" },
      { status: 500 }
    );
  }

  // Generate credentials
  const tempPassword = generateTempPassword(10);
  const email = `${member.id}@bj.local`;

  // Create Supabase Auth user
  const { data: authUser, error: authErr } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role: "member",
        masjid_id: masjidId,
      },
      user_metadata: { full_name: member.full_name },
    });

  if (authErr || !authUser.user) {
    return NextResponse.json(
      { error: `Failed to create user account: ${authErr?.message}` },
      { status: 500 }
    );
  }

  // Create profile row (trigger may also do this, but explicit is safer)
  await adminSupabase.from("profiles").upsert({
    id: authUser.user.id,
    masjid_id: masjidId,
    role: "member",
    full_name: member.full_name,
    phone: member.phone,
    force_password_change: true,
  });

  // Update member row
  const { error: updateErr } = await adminSupabase
    .from("members")
    .update({
      status: "active",
      member_number: memberNum,
      profile_id: authUser.user.id,
    })
    .eq("id", id);

  if (updateErr) {
    // Rollback auth user
    await adminSupabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: "Failed to update member record" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    credentials: {
      memberNumber: memberNum,
      phone: member.phone,
      password: tempPassword,
      name: member.full_name,
    },
  });
}
