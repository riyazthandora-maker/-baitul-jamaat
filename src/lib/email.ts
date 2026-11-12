import { createAdminClient } from "@/lib/supabase/server";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  masjid_id?: string;
  attachment?: { filename: string; content: Buffer };
}

export interface EmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    await logToOutbox(payload);
    return { ok: false, error: "Email is not configured." };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM ?? "noreply@development.baitul-jamaat.com";
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.attachment
        ? { attachments: [{ filename: payload.attachment.filename, content: payload.attachment.content }] }
        : {}),
    });

    if (error) {
      const message = error.message ?? "Email delivery failed.";
      console.error("[Email] Resend error:", error);
      await logToOutbox(payload, message);
      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email delivery failed.";
    console.error("[Email] Resend exception:", err);
    await logToOutbox(payload, message);
    return { ok: false, error: message };
  }
}

async function logToOutbox(payload: EmailPayload, error?: string) {
  const supabase = await createAdminClient();
  await supabase.from("outbox").insert({
    to_email: payload.to,
    subject: payload.subject,
    html: payload.html,
    masjid_id: payload.masjid_id ?? null,
    sent: false,
    error: error ?? null,
  });
}
