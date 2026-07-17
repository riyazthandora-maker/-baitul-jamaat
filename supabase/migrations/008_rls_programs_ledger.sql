-- =============================================================
-- Migration 008: RLS policies for programs, enrollments, ledger, receipts
-- =============================================================

ALTER TABLE programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------
CREATE POLICY "super_admin: full access to programs"
  ON programs FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own programs"
  ON programs FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own masjid programs"
  ON programs FOR SELECT
  USING (auth_role() = 'member' AND masjid_id = auth_masjid_id());

-- ---------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------
CREATE POLICY "super_admin: full access to enrollments"
  ON enrollments FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own enrollments"
  ON enrollments FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

-- ---------------------------------------------------------------
-- ledger
-- ---------------------------------------------------------------
CREATE POLICY "super_admin: full access to ledger"
  ON ledger FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own ledger"
  ON ledger FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own ledger entries"
  ON ledger FOR SELECT
  USING (
    auth_role() = 'member' AND
    member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------
CREATE POLICY "super_admin: full access to receipts"
  ON receipts FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own receipts"
  ON receipts FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own receipts"
  ON receipts FOR SELECT
  USING (
    auth_role() = 'member' AND
    member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );

-- Service role (used by cron) bypasses RLS automatically.
