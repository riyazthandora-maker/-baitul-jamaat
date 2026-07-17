-- ================================================================
-- BAITUL JAMAAT — Run this entire file in Supabase SQL Editor
-- Paste into: Dashboard → SQL Editor → New query → Run
-- ================================================================

-- PART 1: Initial Schema
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE masjids (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  upi_id        TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  masjid_code   TEXT NOT NULL UNIQUE,
  member_seq    INTEGER NOT NULL DEFAULT 0,
  receipt_seq   INTEGER NOT NULL DEFAULT 0
);

CREATE TYPE user_role AS ENUM ('super_admin', 'masjid_admin', 'member');

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id             UUID REFERENCES masjids(id) ON DELETE SET NULL,
  role                  user_role NOT NULL DEFAULT 'member',
  full_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  force_password_change BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TYPE member_status AS ENUM ('pending', 'active', 'inactive', 'rejected');

CREATE TABLE members (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  profile_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  member_number  TEXT,
  status         member_status NOT NULL DEFAULT 'pending',
  photo_url      TEXT,
  id_doc_url     TEXT,
  id_type        TEXT,
  id_last4       TEXT,
  full_name      TEXT NOT NULL,
  dob            DATE,
  gender         TEXT,
  address        TEXT,
  qualification  TEXT,
  phone          TEXT NOT NULL,
  email          TEXT
);

CREATE TABLE outbox (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id  UUID REFERENCES masjids(id) ON DELETE SET NULL,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  sent       BOOLEAN NOT NULL DEFAULT FALSE,
  error      TEXT
);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id   UUID NOT NULL REFERENCES masjids(id),
  actor_id    UUID NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  before_data JSONB,
  after_data  JSONB,
  reason      TEXT
);

CREATE INDEX idx_members_masjid_id    ON members(masjid_id);
CREATE INDEX idx_members_status       ON members(status);
CREATE INDEX idx_members_phone        ON members(phone);
CREATE INDEX idx_profiles_masjid_id   ON profiles(masjid_id);
CREATE INDEX idx_audit_log_masjid_id  ON audit_log(masjid_id);
CREATE INDEX idx_audit_log_record     ON audit_log(table_name, record_id);

-- PART 2: RLS Policies
-- ================================================================

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION auth_masjid_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'app_metadata' ->> 'masjid_id'),
    ''
  )::UUID
$$;

ALTER TABLE masjids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to masjids"
  ON masjids FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own masjid"
  ON masjids FOR SELECT
  USING (auth_role() = 'masjid_admin' AND id = auth_masjid_id());

CREATE POLICY "member: read own masjid"
  ON masjids FOR SELECT
  USING (auth_role() = 'member' AND id = auth_masjid_id());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to profiles"
  ON profiles FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read profiles in own masjid"
  ON profiles FOR SELECT
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "masjid_admin: insert profiles in own masjid"
  ON profiles FOR INSERT
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "masjid_admin: update profiles in own masjid"
  ON profiles FOR UPDATE
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "member: update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to members"
  ON members FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own masjid members"
  ON members FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own member record"
  ON members FOR SELECT
  USING (profile_id = auth.uid());

ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to outbox"
  ON outbox FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own outbox"
  ON outbox FOR SELECT
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: read all audit logs"
  ON audit_log FOR SELECT
  USING (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: read own audit logs"
  ON audit_log FOR SELECT
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "service: insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (TRUE);

-- PART 3: Functions
-- ================================================================

CREATE OR REPLACE FUNCTION next_member_number(p_masjid_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seq    INTEGER;
  v_code   TEXT;
BEGIN
  UPDATE masjids
  SET    member_seq = member_seq + 1
  WHERE  id = p_masjid_id
  RETURNING member_seq, masjid_code
  INTO   v_seq, v_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;
  RETURN 'M-' || v_code || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION next_receipt_number(p_masjid_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seq    INTEGER;
  v_code   TEXT;
BEGIN
  UPDATE masjids
  SET    receipt_seq = receipt_seq + 1
  WHERE  id = p_masjid_id
  RETURNING receipt_seq, masjid_code
  INTO   v_seq, v_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;
  RETURN 'R-' || v_code || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, masjid_id, role, full_name, phone, force_password_change)
  VALUES (
    NEW.id,
    NULLIF((NEW.raw_app_meta_data ->> 'masjid_id'), '')::UUID,
    COALESCE((NEW.raw_app_meta_data ->> 'role')::user_role, 'member'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_app_meta_data ->> 'force_password_change')::BOOLEAN, FALSE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- PART 11: Family Mapping
-- ================================================================

CREATE TABLE families (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  head_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT
);

CREATE TABLE family_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id    UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN (
    'head','husband','wife','son','daughter','father','mother','brother','sister','other'
  )),
  UNIQUE(family_id, member_id)
);

CREATE INDEX idx_families_masjid_id       ON families(masjid_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_member_id ON family_members(member_id);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to families"
  ON families FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own families"
  ON families FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "super_admin: full access to family_members"
  ON family_members FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own family_members"
  ON family_members FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

-- ================================================================
-- Done! Now run: node scripts/seed-super-admin.mjs
-- For demo data: node scripts/seed.mjs
-- ================================================================
