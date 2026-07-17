/**
 * Seed script — creates demo data:
 *   1 masjid (BJM), 1 admin, 15 members, 1 monthly program + charges/payments
 * Run: node scripts/seed.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    console.warn("Could not read .env.local — relying on existing env vars");
  }
}

loadEnv();

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = "Demo@1234";
const MASJID_CODE = "BJM";
const ADMIN_PHONE = "9000000000";

const MEMBERS_DATA = [
  { full_name: "Mohammed Salim", phone: "9100000001", dob: "1975-03-12", gender: "Male", address: "12 Mosque Road, Calicut", qualification: "Teacher" },
  { full_name: "Fathima Salim", phone: "9100000002", dob: "1978-06-20", gender: "Female", address: "12 Mosque Road, Calicut", qualification: "Homemaker" },
  { full_name: "Ahmed Salim", phone: "9100000003", dob: "2001-01-15", gender: "Male", address: "12 Mosque Road, Calicut", qualification: "Student" },
  { full_name: "Abdul Rahman", phone: "9100000004", dob: "1968-11-05", gender: "Male", address: "45 Main Street, Calicut", qualification: "Business" },
  { full_name: "Zainab Rahman", phone: "9100000005", dob: "1972-08-14", gender: "Female", address: "45 Main Street, Calicut", qualification: "Homemaker" },
  { full_name: "Hassan Rahman", phone: "9100000006", dob: "1998-04-22", gender: "Male", address: "45 Main Street, Calicut", qualification: "Software Engineer" },
  { full_name: "Noora Hassan", phone: "9100000007", dob: "2002-09-30", gender: "Female", address: "45 Main Street, Calicut", qualification: "Student" },
  { full_name: "Ibrahim Kunhi", phone: "9100000008", dob: "1960-02-18", gender: "Male", address: "8 Beach Road, Kozhikode", qualification: "Retired" },
  { full_name: "Mariam Ibrahim", phone: "9100000009", dob: "1963-07-25", gender: "Female", address: "8 Beach Road, Kozhikode", qualification: "Homemaker" },
  { full_name: "Yusuf Ibrahim", phone: "9100000010", dob: "1990-12-10", gender: "Male", address: "8 Beach Road, Kozhikode", qualification: "Accountant" },
  { full_name: "Safiya Yusuf", phone: "9100000011", dob: "1993-05-08", gender: "Female", address: "8 Beach Road, Kozhikode", qualification: "Nurse" },
  { full_name: "Omar Farooq", phone: "9100000012", dob: "1985-10-01", gender: "Male", address: "22 Hill View, Calicut", qualification: "Driver" },
  { full_name: "Ruqayyah Omar", phone: "9100000013", dob: "1987-03-17", gender: "Female", address: "22 Hill View, Calicut", qualification: "Teacher" },
  { full_name: "Ali Hasan", phone: "9100000014", dob: "1955-12-28", gender: "Male", address: "3 Old Town, Calicut", qualification: "Retired" },
  { full_name: "Amina Ali", phone: "9100000015", dob: "1958-04-03", gender: "Female", address: "3 Old Town, Calicut", qualification: "Homemaker" },
];

async function createUserIfNotExists(phone, fullName, appMeta, userMeta) {
  const emailAlias = `${phone}@bj.local`;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === emailAlias);
  if (existing) {
    console.log(`  ↳ User exists: ${emailAlias}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: emailAlias,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: appMeta,
    user_metadata: { full_name: fullName, phone, ...userMeta },
  });
  if (error || !data?.user) throw new Error(`Failed to create user ${phone}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log("=== Baitul Jamaat Demo Seed ===\n");

  // 1. Create masjid
  console.log("1. Creating masjid…");
  let masjidId;
  const { data: existingMasjid } = await admin.from("masjids").select("id").eq("masjid_code", MASJID_CODE).maybeSingle();
  if (existingMasjid) {
    masjidId = existingMasjid.id;
    console.log(`  ↳ Masjid already exists: ${masjidId}`);
  } else {
    const { data: masjid, error } = await admin.from("masjids").insert({
      name: "Baitul Jamaat Masjid",
      address: "123 Mosque Lane, Calicut, Kerala 673001",
      phone: "0495-2345678",
      masjid_code: MASJID_CODE,
      lat: 11.2588,
      lng: 75.7804,
      upi_id: "baituljamaatmasjid@upi",
      active: true,
    }).select("id").single();
    if (error) throw new Error(`Masjid insert failed: ${error.message}`);
    masjidId = masjid.id;
    console.log(`  ✓ Masjid created: ${masjidId}`);
  }

  // 2. Create masjid admin
  console.log("2. Creating masjid admin…");
  const adminUserId = await createUserIfNotExists(
    ADMIN_PHONE,
    "Baitul Jamaat Admin",
    { role: "masjid_admin", masjid_id: masjidId, force_password_change: false },
    {}
  );
  console.log(`  ✓ Admin created: ${adminUserId}`);

  // Wait for trigger to create profile
  await new Promise((r) => setTimeout(r, 1000));

  // 3. Create members
  console.log("3. Creating 15 members…");
  const memberIds = [];

  for (const m of MEMBERS_DATA) {
    const userId = await createUserIfNotExists(
      m.phone,
      m.full_name,
      { role: "member", masjid_id: masjidId, force_password_change: false },
      {}
    );

    // Wait for trigger
    await new Promise((r) => setTimeout(r, 300));

    // Get profile_id
    const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

    // Check if member record exists
    const { data: existingMember } = await admin.from("members").select("id").eq("profile_id", userId).maybeSingle();
    if (existingMember) {
      memberIds.push(existingMember.id);
      console.log(`  ↳ Member exists: ${m.full_name}`);
      continue;
    }

    // Generate member number
    const { data: mnResult } = await admin.rpc("next_member_number", { p_masjid_id: masjidId });

    const { data: member, error } = await admin.from("members").insert({
      masjid_id: masjidId,
      profile_id: profile?.id ?? userId,
      member_number: mnResult,
      status: "active",
      full_name: m.full_name,
      dob: m.dob,
      gender: m.gender,
      address: m.address,
      qualification: m.qualification,
      phone: m.phone,
    }).select("id").single();

    if (error) {
      console.warn(`  ⚠ Failed to insert member ${m.full_name}: ${error.message}`);
      continue;
    }
    memberIds.push(member.id);
    console.log(`  ✓ ${m.full_name} (${mnResult})`);
  }

  // 4. Create program
  console.log("4. Creating monthly program…");
  let programId;
  const { data: existingProgram } = await admin.from("programs").select("id").eq("masjid_id", masjidId).eq("name", "Monthly Contribution").maybeSingle();
  if (existingProgram) {
    programId = existingProgram.id;
    console.log(`  ↳ Program exists: ${programId}`);
  } else {
    const { data: program, error } = await admin.from("programs").insert({
      masjid_id: masjidId,
      name: "Monthly Contribution",
      default_amount: 500,
      recurrence: "monthly",
      start_date: "2025-01-01",
      active: true,
    }).select("id").single();
    if (error) throw new Error(`Program insert failed: ${error.message}`);
    programId = program.id;
    console.log(`  ✓ Program created: ${programId}`);
  }

  // 5. Enroll members and create ledger entries
  console.log("5. Enrolling members and creating ledger entries…");
  const months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];

  for (const memberId of memberIds) {
    // Enroll
    const { data: existingEnroll } = await admin.from("enrollments").select("id").eq("program_id", programId).eq("member_id", memberId).maybeSingle();
    let enrollmentId = existingEnroll?.id;
    if (!enrollmentId) {
      const { data: enroll } = await admin.from("enrollments").insert({
        masjid_id: masjidId,
        program_id: programId,
        member_id: memberId,
        amount: 500,
      }).select("id").single();
      enrollmentId = enroll?.id;
    }

    // Create charges for 6 months
    for (const month of months) {
      const periodKey = `${programId}:${memberId}:${month}`;
      await admin.from("ledger").upsert({
        masjid_id: masjidId,
        member_id: memberId,
        program_id: programId,
        enrollment_id: enrollmentId,
        type: "charge",
        amount: 500,
        description: `Monthly Contribution — ${month}`,
        period_key: periodKey,
      }, { onConflict: "period_key", ignoreDuplicates: true });
    }

    // Create a payment for first 3 months (partial payment scenario)
    const { data: rnResult } = await admin.rpc("next_receipt_number", { p_masjid_id: masjidId });
    const { data: receipt } = await admin.from("receipts").upsert({
      masjid_id: masjidId,
      member_id: memberId,
      receipt_number: rnResult ?? `R-${MASJID_CODE}-SEED`,
      amount: 1500,
      notes: "Payment for Jan–Mar 2025",
    }, { onConflict: "receipt_number", ignoreDuplicates: true }).select("id").single();

    if (receipt) {
      await admin.from("ledger").upsert({
        masjid_id: masjidId,
        member_id: memberId,
        receipt_id: receipt.id,
        type: "payment",
        amount: 1500,
        description: "Cash payment — Jan to Mar 2025",
      }, { ignoreDuplicates: true });
    }
  }
  console.log(`  ✓ Ledger entries created for ${memberIds.length} members`);

  console.log("\n=== Seed complete! ===");
  console.log(`Masjid code: ${MASJID_CODE}`);
  console.log(`Admin login: phone=${ADMIN_PHONE}, password=${DEMO_PASSWORD}`);
  console.log(`Member logins: phone=910000000X (1-15), password=${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
