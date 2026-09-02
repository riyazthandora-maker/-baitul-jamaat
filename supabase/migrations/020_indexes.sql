-- =============================================================
-- Migration 020: Performance indexes for all tables
-- -------------------------------------------------------------
-- Adds composite / partial / trigram indexes that match the
-- actual query patterns in the app (list pages, statements,
-- billing cron, receipt voiding, CSV search, email worker).
-- Also drops a few single-column indexes now covered by the
-- new composites (a (a,b) index already serves WHERE a = ?).
-- =============================================================

-- Enable trigram search (needed for ILIKE '%term%' on full_name)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- masjids
-- -------------------------------------------------------------
-- Lookup by code on registration + login screens.
CREATE INDEX IF NOT EXISTS idx_masjids_masjid_code ON masjids(masjid_code);

-- =============================================================
-- members  (largest text-search table)
-- -------------------------------------------------------------
-- Member portal & profile lookups by auth user id.
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON members(profile_id);

-- Admin member list: WHERE status = ? (RLS: masjid_id) ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_members_masjid_status_created
  ON members(masjid_id, status, created_at DESC);

-- Admin member search: full_name ILIKE '%term%'.
CREATE INDEX IF NOT EXISTS idx_members_full_name_trgm
  ON members USING gin (full_name gin_trgm_ops);

-- Covered by the composite above; drop the redundant singles.
DROP INDEX IF EXISTS idx_members_masjid_id;
DROP INDEX IF EXISTS idx_members_status;

-- =============================================================
-- profiles
-- -------------------------------------------------------------
-- Cron statement job: WHERE masjid_id = ? AND role = 'masjid_admin'.
CREATE INDEX IF NOT EXISTS idx_profiles_masjid_role ON profiles(masjid_id, role);

DROP INDEX IF EXISTS idx_profiles_masjid_id;

-- =============================================================
-- programs
-- -------------------------------------------------------------
-- Billing cron + admin lists: WHERE masjid_id = ? AND active = true.
CREATE INDEX IF NOT EXISTS idx_programs_masjid_active_created
  ON programs(masjid_id, active, created_at);

DROP INDEX IF EXISTS idx_programs_masjid_id;

-- =============================================================
-- receipts
-- -------------------------------------------------------------
-- Admin receipt list (per masjid) and per-member receipt list.
CREATE INDEX IF NOT EXISTS idx_receipts_masjid_created
  ON receipts(masjid_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receipts_member_created
  ON receipts(member_id, created_at);

DROP INDEX IF EXISTS idx_receipts_masjid_id;
DROP INDEX IF EXISTS idx_receipts_member_id;

-- =============================================================
-- ledger  (largest table — statements, balances, voiding)
-- -------------------------------------------------------------
-- Member statements: WHERE member_id = ? ORDER BY created_at.
CREATE INDEX IF NOT EXISTS idx_ledger_member_created
  ON ledger(member_id, created_at);

-- Monthly statement cron: WHERE masjid_id = ? AND voided_at IS NULL ORDER BY created_at.
CREATE INDEX IF NOT EXISTS idx_ledger_masjid_created_active
  ON ledger(masjid_id, created_at)
  WHERE voided_at IS NULL;

-- Receipt voiding / refunds: WHERE receipt_id = ?.
CREATE INDEX IF NOT EXISTS idx_ledger_receipt_id ON ledger(receipt_id);

-- Program-level ledger views: WHERE program_id = ?.
CREATE INDEX IF NOT EXISTS idx_ledger_program_id ON ledger(program_id);

-- Cancelling an enrollment voids its rows: WHERE enrollment_id = ?.
CREATE INDEX IF NOT EXISTS idx_ledger_enrollment_id ON ledger(enrollment_id);

-- Covered by idx_ledger_member_created (leftmost prefix).
DROP INDEX IF EXISTS idx_ledger_member_id;
-- NOTE: idx_ledger_masjid_id is KEPT — the admin ledger screen lists by
-- masjid without any voided_at filter, which the partial index above
-- does not serve.

-- =============================================================
-- audit_log
-- -------------------------------------------------------------
-- Audit trail listing per masjid (admin panel).
CREATE INDEX IF NOT EXISTS idx_audit_log_masjid_created
  ON audit_log(masjid_id, created_at);

DROP INDEX IF EXISTS idx_audit_log_masjid_id;
-- KEEP idx_audit_log_record (table_name, record_id) — used for lookups.

-- =============================================================
-- families
-- -------------------------------------------------------------
-- Family list/search per masjid.
CREATE INDEX IF NOT EXISTS idx_families_masjid_name ON families(masjid_id, name);

DROP INDEX IF EXISTS idx_families_masjid_id;

-- =============================================================
-- donations
-- -------------------------------------------------------------
-- Donation list per masjid, newest first.
CREATE INDEX IF NOT EXISTS idx_donations_masjid_created
  ON donations(masjid_id, created_at);

DROP INDEX IF EXISTS idx_donations_masjid_id;

-- =============================================================
-- masjid_applications
-- -------------------------------------------------------------
-- Super-admin review queue: WHERE status = ? ORDER BY created_at.
CREATE INDEX IF NOT EXISTS idx_masjid_applications_status_created
  ON masjid_applications(status, created_at);

-- =============================================================
-- profile_change_requests
-- -------------------------------------------------------------
-- Admin review list per masjid.
CREATE INDEX IF NOT EXISTS idx_pcr_masjid_status_created
  ON profile_change_requests(masjid_id, status, created_at);

DROP INDEX IF EXISTS idx_profile_change_requests_masjid;
-- KEEP idx_profile_change_requests_member (lookup by member).
-- KEEP unique idx_profile_change_requests_pending (enforces 1 open request).

-- =============================================================
-- admin_otps
-- -------------------------------------------------------------
-- Verify/expire lookups per user; daily cleanup by expiry.
CREATE INDEX IF NOT EXISTS idx_admin_otps_user_created
  ON admin_otps(user_id, created_at);

-- =============================================================
-- outbox  (no indexes existed)
-- -------------------------------------------------------------
-- Email worker: pick up unsent rows in order.
CREATE INDEX IF NOT EXISTS idx_outbox_unsent
  ON outbox(created_at)
  WHERE sent = false;

-- Per-masjid outbox view (admin diagnostics).
CREATE INDEX IF NOT EXISTS idx_outbox_masjid_created
  ON outbox(masjid_id, created_at);

-- =============================================================
-- enrollments
-- -------------------------------------------------------------
-- Already well indexed: idx_enrollments_program, idx_enrollments_member,
-- and UNIQUE(program_id, member_id). No changes.
-- =============================================================
