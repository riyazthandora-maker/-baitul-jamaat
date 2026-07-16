/**
 * Creates the super admin account in Supabase Auth.
 * Run once after migrations: node scripts/seed-super-admin.mjs
 *
 * Required env vars (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPER_ADMIN_PHONE      (10-digit phone, used as login)
 *   SUPER_ADMIN_PASSWORD   (initial password)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually (no dotenv dependency needed)
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

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  SUPER_ADMIN_PHONE: phone,
  SUPER_ADMIN_PASSWORD: password,
} = process.env;

if (!url || !serviceKey || !phone || !password) {
  console.error(
    "Missing env vars. Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_PHONE, SUPER_ADMIN_PASSWORD"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const emailAlias = `${phone.replace(/\s/g, "")}@bj.local`;

console.log(`Creating super admin: phone=${phone}, email=${emailAlias}`);

// Check if already exists
const { data: existing } = await admin.auth.admin.listUsers();
const alreadyExists = existing?.users?.find((u) => u.email === emailAlias);

if (alreadyExists) {
  console.log(`Super admin already exists (id=${alreadyExists.id}). Updating password…`);
  const { error } = await admin.auth.admin.updateUserById(alreadyExists.id, {
    password,
    app_metadata: { role: "super_admin", force_password_change: false },
  });
  if (error) {
    console.error("Failed to update:", error.message);
    process.exit(1);
  }
  console.log("✓ Super admin password updated.");
  process.exit(0);
}

const { data, error } = await admin.auth.admin.createUser({
  email: emailAlias,
  password,
  email_confirm: true,
  app_metadata: {
    role: "super_admin",
    force_password_change: false,
  },
  user_metadata: {
    full_name: "Super Admin",
    phone,
  },
});

if (error || !data?.user) {
  console.error("Failed to create super admin:", error?.message);
  process.exit(1);
}

console.log(`✓ Super admin created successfully.`);
console.log(`  ID:    ${data.user.id}`);
console.log(`  Phone: ${phone}`);
console.log(`  Login: phone="${phone}", password="${password}"`);
