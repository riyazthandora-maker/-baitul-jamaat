-- =============================================================
-- Migration 004: Seed super admin
-- This runs after schema is ready. The actual auth.users row is
-- created via the seed script (scripts/seed-super-admin.mjs)
-- because Supabase SQL Editor cannot call auth.admin functions.
-- This file is a placeholder / documentation.
-- =============================================================

-- Super admin is created by running:
--   node scripts/seed-super-admin.mjs
-- which calls the Supabase Admin API with SUPABASE_SERVICE_ROLE_KEY.
-- The SUPER_ADMIN_PHONE env var is used as the login identifier.
-- The SUPER_ADMIN_PASSWORD env var is the initial password.

SELECT 'Run scripts/seed-super-admin.mjs to create the super admin account' AS note;
