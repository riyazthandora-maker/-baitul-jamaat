import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateTempPassword, getAppUrl } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

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

  // Gap 7: email credentials to the member if they have an email address
  if (member.email) {
    const appUrl = getAppUrl(request.nextUrl.origin);
    // Fetch masjid name for the email
    const { data: masjid } = await adminSupabase
      .from("masjids")
      .select("name")
      .eq("id", masjidId)
      .maybeSingle();

    await sendEmail({
      to: member.email,
      subject: `Your Membership Has Been Approved — ${masjid?.name ?? "Baitul Jamaat"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#166534">Membership Approved</h2>
          <p>Assalamu Alaikum <strong>${member.full_name}</strong>,</p>
          <p>Your membership at <strong>${masjid?.name ?? "the masjid"}</strong> has been approved. Here are your account details:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Member Number</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace">${memberNum}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Login Phone</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${member.phone}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Temporary Password</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace">${tempPassword}</td>
            </tr>
          </table>
          <p style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px">
            You will be asked to set a new password on your first login.
          </p>
          ${appUrl ? `<p><a href="${appUrl}/login" style="display:inline-block;background:#166534;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign In Now</a></p>` : ""}
        </div>
      `,
      masjid_id: masjidId,
    });
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
