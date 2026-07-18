import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reason: string | null = body.reason ?? null;

  // Fetch member before updating to get their email and name
  const { data: member } = await supabase
    .from("members")
    .select("full_name, email, masjid_id")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  const { error } = await supabase
    .from("members")
    .update({ status: "rejected", duplicate_reason: reason })
    .eq("id", id)
    .eq("status", "pending");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Gap 8: notify member if they have an email
  if (member?.email) {
    const { data: masjid } = await supabase
      .from("masjids")
      .select("name")
      .eq("id", member.masjid_id)
      .maybeSingle();

    await sendEmail({
      to: member.email,
      subject: `Regarding Your Membership Registration — ${masjid?.name ?? "Baitul Jamaat"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#166534">Membership Registration Update</h2>
          <p>Assalamu Alaikum <strong>${member.full_name}</strong>,</p>
          <p>Thank you for registering at <strong>${masjid?.name ?? "the masjid"}</strong>.</p>
          <p>After reviewing your application, we are unable to approve your membership at this time.</p>
          ${reason ? `<p style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px"><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>Please contact the masjid directly if you have any questions.</p>
          <p style="color:#6b7280;font-size:0.875rem">— ${masjid?.name ?? "Baitul Jamaat"}</p>
        </div>
      `,
      masjid_id: member.masjid_id,
    });
  }

  return NextResponse.json({ success: true });
}
