import { createAdminClient } from "@/lib/supabase/server";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  masjid_id?: string;
  attachment?: { filename: string; content: Buffer };
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM ?? "noreply@baitujamaat.app";
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
      console.error("[Email] Resend error:", error);
      await logToOutbox(payload);
    }
  } else {
    await logToOutbox(payload);
  }
}

async function logToOutbox(payload: EmailPayload) {
  const supabase = await createAdminClient();
  await supabase.from("outbox").insert({
    to_email: payload.to,
    subject: payload.subject,
    html: payload.html,
    masjid_id: payload.masjid_id ?? null,
    sent: false,
  });
}
