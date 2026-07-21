import crypto from "crypto";

// ── Cookie helpers ────────────────────────────────────────────────────────────
// Cookie format: {userId}:{expiresAtMs}:{hmac-sha256-hex}
// UUID contains no colons, so splitting on ":" is unambiguous for 3 parts.

function hmacKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

export function signOtpCtx(userId: string, expiresAtMs: number): string {
  const data = `${userId}:${expiresAtMs}`;
  const hmac = crypto.createHmac("sha256", hmacKey()).update(data).digest("hex");
  return `${data}:${hmac}`;
}

export function parseOtpCtx(value: string): { userId: string } | null {
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, hmac] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!userId || isNaN(expiresAt) || Date.now() > expiresAt) return null;

  const data = `${userId}:${expiresAt}`;
  const expected = crypto.createHmac("sha256", hmacKey()).update(data).digest("hex");

  const hmacBuf = Buffer.from(hmac, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (hmacBuf.length !== expectedBuf.length || hmacBuf.length === 0) return null;
  if (!crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;

  return { userId };
}

// ── Code helpers ──────────────────────────────────────────────────────────────

export function generateOtp(): { code: string; codeHash: string } {
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  return { code, codeHash };
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ── Email helpers ─────────────────────────────────────────────────────────────

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked =
    local.length > 2 ? local[0] + "***" + local.slice(-1) : "***";
  return `${masked}@${domain}`;
}

export function otpEmailHtml(code: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#166534">Baitul Jamaat — Login Verification</h2>
      <p>Your one-time login code is:</p>
      <div style="background:#f0fdf4;border:2px solid #166534;border-radius:8px;padding:24px;text-align:center;margin:16px 0">
        <span style="font-size:2.5em;font-weight:700;letter-spacing:0.25em;color:#166534;font-family:monospace">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:0.875rem">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
  `;
}
