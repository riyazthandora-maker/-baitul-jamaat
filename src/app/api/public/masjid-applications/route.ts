import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { masjidApplicationSchema } from "@/lib/validators/masjid";
import { sendEmail } from "@/lib/email";
import { ZodError } from "zod";
import { createHash } from "crypto";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot — bots fill this, humans don't; silently succeed to not tip them off
  if ((body as Record<string, unknown>)._trap) {
    return NextResponse.json({ success: true });
  }

  let validated: ReturnType<typeof masjidApplicationSchema.parse>;
  try {
    validated = masjidApplicationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.errors.map((e) => e.message).join(", ") },
        { status: 422 }
      );
    }
    throw err;
  }

  const supabase = getAdminClient();

  // Rate limit: max 3 attempts per IP per 24 hours
  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = createHash("sha256")
    .update(rawIp + (process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""))
    .digest("hex")
    .slice(0, 16);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("masjid_applications")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many requests from this network. Please try again tomorrow." },
      { status: 429 }
    );
  }

  // Check email uniqueness
  const { data: existing } = await supabase
    .from("masjid_applications")
    .select("id")
    .ilike("email", validated.email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A registration request with this email already exists. We will be in touch soon." },
      { status: 409 }
    );
  }

  // Insert application
  const { error: insertError } = await supabase.from("masjid_applications").insert({
    name: validated.name,
    address: validated.address,
    email: validated.email,
    phone: validated.phone,
    ip_hash: ipHash,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "A registration request with this email already exists." },
        { status: 409 }
      );
    }
    console.error("[MasjidApplication] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to submit request. Please try again." }, { status: 500 });
  }

  // Notify super admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const notifyEmail = superAdminEmail ?? process.env.RESEND_FROM ?? null;

  if (notifyEmail) {
    await sendEmail({
      to: notifyEmail,
      subject: `New Masjid Registration Request — ${validated.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#166534">New Masjid Registration Request</h2>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Masjid Name</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${validated.name}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Address</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${validated.address}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Email</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${validated.email}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Phone</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${validated.phone}</td>
            </tr>
          </table>
          <a href="${appUrl}/superadmin/applications"
             style="display:inline-block;background:#166534;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Review Application
          </a>
        </div>
      `,
    });
  } else {
    console.info("[MasjidApplication] New application submitted:", validated.name, validated.email);
  }

  return NextResponse.json({ success: true });
}
