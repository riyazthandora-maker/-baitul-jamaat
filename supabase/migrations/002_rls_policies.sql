-- =============================================================
-- Migration 002: Row Level Security policies
-- =============================================================

-- Helper: get role from JWT app_metadata
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    ''
  )
$$;

-- Helper: get masjid_id from JWT app_metadata
CREATE OR REPLACE FUNCTION auth_masjid_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'app_metadata' ->> 'masjid_id'),
    ''
  )::UUID
$$;

-- ---------------------------------------------------------------
-- masjids
-- ---------------------------------------------------------------
ALTER TABLE masjids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to masjids"
  ON masjids FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own masjid"
  ON masjids FOR SELECT
  USING (
    auth_role() = 'masjid_admin'
    AND id = auth_masjid_id()
  );

CREATE POLICY "member: read own masjid"
  ON masjids FOR SELECT
  USING (
    auth_role() = 'member'
    AND id = auth_masjid_id()
  );

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to profiles"
  ON profiles FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read profiles in own masjid"
  ON profiles FOR SELECT
  USING (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

CREATE POLICY "masjid_admin: insert profiles in own masjid"
  ON profiles FOR INSERT
  WITH CHECK (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

CREATE POLICY "masjid_admin: update profiles in own masjid"
  ON profiles FOR UPDATE
  USING (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

CREATE POLICY "member: read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "member: update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------
-- members
-- ---------------------------------------------------------------
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to members"
  ON members FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own masjid members"
  ON members FOR ALL
  USING (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  )
  WITH CHECK (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

CREATE POLICY "member: read own member record"
  ON members FOR SELECT
  USING (profile_id = auth.uid());

-- ---------------------------------------------------------------
-- outbox
-- ---------------------------------------------------------------
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to outbox"
  ON outbox FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own outbox"
  ON outbox FOR SELECT
  USING (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

-- ---------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Immutable — only insert allowed; no update/delete for anyone
CREATE POLICY "super_admin: read all audit logs"
  ON audit_log FOR SELECT
  USING (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own audit logs"
  ON audit_log FOR SELECT
  USING (
    auth_role() = 'masjid_admin'
    AND masjid_id = auth_masjid_id()
  );

-- Service role inserts audit_log (via API routes using service key)
CREATE POLICY "service: insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (TRUE);
