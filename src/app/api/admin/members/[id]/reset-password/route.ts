import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { generateTempPassword } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const { id: memberId } = await params;

  const adminRlsClient = await createAdminClient();

  // Fetch member — verify they belong to this admin's masjid
  const { data: member } = await adminRlsClient
    .from("members")
    .select("id, profile_id, full_name, member_number, email, masjid_id, status")
    .eq("id", memberId)
    .maybeSingle();

  if (!member || member.masjid_id !== masjidId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.profile_id) {
    return NextResponse.json(
      { error: "This member does not have a login account yet." },
      { status: 400 }
    );
  }

  const tempPassword = generateTempPassword();

  const serviceClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: updateError } = await serviceClient.auth.admin.updateUserById(
    member.profile_id,
    {
      password: tempPassword,
      app_metadata: { force_password_change: true },
    }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Mark force_password_change so member must set a new password on next login
  await adminRlsClient
    .from("profiles")
    .update({ force_password_change: true })
    .eq("id", member.profile_id);

  // Email temp password to member if they have an email on file
  if (member.email) {
    await sendEmail({
      to: member.email,
      subject: "Your Baitul Jamaat password has been reset",
      html: `
        <p>As-salamu alaykum ${member.full_name},</p>
        <p>Your Baitul Jamaat member account password has been reset by the masjid admin.</p>
        <p><strong>Member ID:</strong> ${member.member_number}<br/>
        <strong>Temporary Password:</strong> <code style="font-size:1.1em;">${tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
        <p>JazakAllah Khayr</p>
      `,
      masjid_id: masjidId,
    });
  }

  return NextResponse.json({
    credentials: {
      memberNumber: member.member_number,
      name: member.full_name,
      password: tempPassword,
      emailSent: !!member.email,
    },
  });
}
