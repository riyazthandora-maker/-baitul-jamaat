-- =============================================================
-- Migration 001: Core schema — masjids, profiles, members, outbox, audit_log
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- masjids
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- profiles  (mirrors auth.users; id = auth.users.id)
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- members
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- outbox  (email fallback when RESEND_API_KEY not set)
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- audit_log  (immutable; never hard-delete)
-- ---------------------------------------------------------------
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

-- Indexes
CREATE INDEX idx_members_masjid_id    ON members(masjid_id);
CREATE INDEX idx_members_status       ON members(status);
CREATE INDEX idx_members_phone        ON members(phone);
CREATE INDEX idx_profiles_masjid_id   ON profiles(masjid_id);
CREATE INDEX idx_audit_log_masjid_id  ON audit_log(masjid_id);
CREATE INDEX idx_audit_log_record     ON audit_log(table_name, record_id);
