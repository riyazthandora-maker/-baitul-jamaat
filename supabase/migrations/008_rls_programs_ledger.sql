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
CREATE POLICY "super_admin_programs_all" ON programs FOR ALL TO authenticated
  USING (auth_role() = 'super_admin') WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin_programs_all" ON programs FOR ALL TO authenticated
  USING (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id());

CREATE POLICY "member_read_programs" ON programs FOR SELECT TO authenticated
  USING (auth_role() = 'member' AND masjid_id::text = auth_masjid_id());

-- ---------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_enrollments_all" ON enrollments FOR ALL TO authenticated
  USING (auth_role() = 'super_admin') WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin_enrollments_all" ON enrollments FOR ALL TO authenticated
  USING (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id());

-- ---------------------------------------------------------------
-- ledger
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_ledger_all" ON ledger FOR ALL TO authenticated
  USING (auth_role() = 'super_admin') WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin_ledger_all" ON ledger FOR ALL TO authenticated
  USING (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id());

CREATE POLICY "member_own_ledger" ON ledger FOR SELECT TO authenticated
  USING (
    auth_role() = 'member' AND
    member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- receipts
-- ---------------------------------------------------------------
CREATE POLICY "super_admin_receipts_all" ON receipts FOR ALL TO authenticated
  USING (auth_role() = 'super_admin') WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin_receipts_all" ON receipts FOR ALL TO authenticated
  USING (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id::text = auth_masjid_id());

CREATE POLICY "member_own_receipts" ON receipts FOR SELECT TO authenticated
  USING (
    auth_role() = 'member' AND
    member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );

-- Service role (used by cron) bypasses RLS automatically.
