import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { masjidSchema } from "@/lib/validators/masjid";
import { generateTempPassword } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
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

  const applicationId = (body as Record<string, unknown>).application_id as string | undefined;

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
      contact_email: validated.contact_email || null,
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
    const isDuplicate =
      authError?.message?.toLowerCase().includes("already registered") ||
      authError?.message?.toLowerCase().includes("already in use") ||
      authError?.message?.toLowerCase().includes("email") ||
      (authError as unknown as { code?: string })?.code === "email_exists";
    const msg = isDuplicate
      ? `Admin phone ${validated.admin_phone} is already registered in another masjid. Use a different admin phone number.`
      : "Failed to create admin account. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
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

  // If created from an application, mark it approved and email the applicant their credentials
  if (applicationId) {
    const { data: application } = await supabase
      .from("masjid_applications")
      .select("email, name")
      .eq("id", applicationId)
      .maybeSingle();

    await supabase
      .from("masjid_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (application?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      await sendEmail({
        to: application.email,
        subject: `Your Masjid is Ready — ${masjid.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#166534">Your Masjid is Ready on Baitul Jamaat</h2>
            <p>Assalamu Alaikum,</p>
            <p><strong>${masjid.name}</strong> has been set up on Baitul Jamaat. Here are your admin login credentials:</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <tr style="background:#f9fafb">
                <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Masjid Code</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace;font-size:1.1em">${masjid.masjid_code}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Login Phone</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb">${validated.admin_phone}</td>
              </tr>
              <tr style="background:#f9fafb">
                <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Temporary Password</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace">${tempPassword}</td>
              </tr>
            </table>
            <p style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px">
              You will be asked to change your password on first login. Please do not share this email.
            </p>
            ${appUrl ? `<p><a href="${appUrl}/login" style="display:inline-block;background:#166534;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign In Now</a></p>` : ""}
          </div>
        `,
      });
    }
  }

  return NextResponse.json({
    masjid,
    credentials: {
      phone: validated.admin_phone,
      password: tempPassword,
      masjidName: masjid.name,
    },
  });
}
