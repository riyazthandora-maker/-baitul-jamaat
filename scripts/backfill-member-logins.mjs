/**
 * One-time backfill script: create Supabase Auth accounts for every active
 * member that was bulk-imported and has no login (profile_id IS NULL).
 *
 * Run from the project root:
 *   node --env-file=.env.local scripts/backfill-member-logins.mjs
 *
 * Output: scripts/backfill-credentials.csv  (keep secure, delete after use)
 *
 * Safe to re-run — members that already have a profile_id are skipped.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_FILE     = "scripts/backfill-credentials.csv";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTempPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function csvEscape(val) {
  if (val == null) return "";
  const str = String(val);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching active members with no login account…");

  const { data: members, error: fetchErr } = await supabase
    .from("members")
    .select("id, full_name, phone, email, member_number, masjid_id, status, profile_id")
    .eq("status", "active")
    .is("profile_id", null)
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("Failed to fetch members:", fetchErr.message);
    process.exit(1);
  }

  if (!members || members.length === 0) {
    console.log("No members need backfilling. All active members already have login accounts.");
    process.exit(0);
  }

  console.log(`Found ${members.length} member(s) to backfill.\n`);

  const csvRows = ["Member Number,Name,Phone,Temporary Password,Email Exists,Status"];
  let succeeded = 0;
  let failed = 0;

  for (const member of members) {
    process.stdout.write(`  ${member.member_number ?? member.id}  ${member.full_name}  … `);

    const tempPassword = generateTempPassword(10);
    const authEmail    = `${member.id}@bj.local`;

    // 1. Create Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role: "member",
        masjid_id: member.masjid_id,
        force_password_change: true,
      },
      user_metadata: { full_name: member.full_name },
    });

    if (authErr || !authData?.user) {
      const msg = authErr?.message ?? "unknown error";
      console.log(`FAILED (auth) — ${msg}`);
      failed++;
      csvRows.push(
        [member.member_number, member.full_name, member.phone, "FAILED: " + msg, !!member.email, "failed"]
          .map(csvEscape).join(",")
      );
      continue;
    }

    const profileId = authData.user.id;

    // 2. Upsert profile row
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: profileId,
      masjid_id: member.masjid_id,
      role: "member",
      full_name: member.full_name,
      phone: member.phone,
      force_password_change: true,
    });

    if (profileErr) {
      console.log(`FAILED (profile) — ${profileErr.message}`);
      // Clean up auth user so it's not orphaned
      await supabase.auth.admin.deleteUser(profileId);
      failed++;
      csvRows.push(
        [member.member_number, member.full_name, member.phone, "FAILED: " + profileErr.message, !!member.email, "failed"]
          .map(csvEscape).join(",")
      );
      continue;
    }

    // 3. Write profile_id back to members row
    const { error: updateErr } = await supabase
      .from("members")
      .update({ profile_id: profileId })
      .eq("id", member.id);

    if (updateErr) {
      console.log(`FAILED (members update) — ${updateErr.message}`);
      await supabase.auth.admin.deleteUser(profileId);
      failed++;
      csvRows.push(
        [member.member_number, member.full_name, member.phone, "FAILED: " + updateErr.message, !!member.email, "failed"]
          .map(csvEscape).join(",")
      );
      continue;
    }

    console.log("OK");
    succeeded++;
    csvRows.push(
      [member.member_number, member.full_name, member.phone, tempPassword, !!member.email, "ok"]
        .map(csvEscape).join(",")
    );
  }

  // Write CSV
  writeFileSync(OUT_FILE, csvRows.join("\n"), "utf8");

  console.log(`
─────────────────────────────────────────
  Backfill complete
  Succeeded : ${succeeded}
  Failed    : ${failed}
  CSV saved : ${OUT_FILE}
─────────────────────────────────────────
${failed > 0 ? "Re-run the script to retry failed members — succeeded ones are skipped automatically." : ""}
⚠  Delete ${OUT_FILE} after distributing credentials.
`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
