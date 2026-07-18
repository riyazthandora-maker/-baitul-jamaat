import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status: "approved" | "rejected"; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  // Fetch application before updating so we have the email and name
  const { data: application } = await supabase
    .from("masjid_applications")
    .select("email, name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("masjid_applications")
    .update({
      status: body.status,
      reviewed_at: new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Gap 10: notify applicant on rejection
  if (body.status === "rejected" && application?.email) {
    await sendEmail({
      to: application.email,
      subject: `Regarding Your Masjid Registration Request — Baitul Jamaat`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#166534">Masjid Registration Update</h2>
          <p>Assalamu Alaikum,</p>
          <p>Thank you for your interest in registering <strong>${application.name}</strong> on Baitul Jamaat.</p>
          <p>After reviewing your request, we are unable to process your registration at this time.</p>
          ${body.notes ? `<p style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px"><strong>Notes:</strong> ${body.notes}</p>` : ""}
          <p>If you believe this is an error or would like more information, please reply to this email.</p>
          <p style="color:#6b7280;font-size:0.875rem">— The Baitul Jamaat Team</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true });
}
