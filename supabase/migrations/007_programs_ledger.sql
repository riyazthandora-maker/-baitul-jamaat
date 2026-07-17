-- =============================================================
-- Migration 007: Revenue programs, enrollments, ledger, receipts
-- =============================================================

-- ---------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------
CREATE TABLE programs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  default_amount NUMERIC(10,2) NOT NULL CHECK (default_amount > 0),
  recurrence     TEXT NOT NULL CHECK (recurrence IN ('monthly', 'yearly')),
  start_date     DATE NOT NULL,
  end_date       DATE,
  active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- enrollments  (program × member, per-member overridable amount)
-- ---------------------------------------------------------------
CREATE TABLE enrollments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id  UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  UNIQUE(program_id, member_id)
);

-- ---------------------------------------------------------------
-- receipts  (never hard-deleted; voided with reason)
-- ---------------------------------------------------------------
CREATE TABLE receipts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes          TEXT,
  voided_at      TIMESTAMPTZ,
  void_reason    TEXT,
  pdf_path       TEXT
);

-- ---------------------------------------------------------------
-- ledger  (charges +, discounts −, payments −)
-- ---------------------------------------------------------------
CREATE TABLE ledger (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id     UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  program_id    UUID REFERENCES programs(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
  receipt_id    UUID REFERENCES receipts(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('charge', 'discount', 'payment')),
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description   TEXT,
  -- period_key set only on cron-generated charges for idempotency
  -- format: '{program_id}:{member_id}:{YYYY-MM}'  (monthly)
  --         '{program_id}:{member_id}:{YYYY}'      (yearly)
  period_key    TEXT,
  voided_at     TIMESTAMPTZ,
  void_reason   TEXT
);

-- Idempotency: one charge per period per program+member
CREATE UNIQUE INDEX idx_ledger_period_key
  ON ledger(period_key)
  WHERE period_key IS NOT NULL;

-- Indexes
CREATE INDEX idx_programs_masjid_id    ON programs(masjid_id);
CREATE INDEX idx_enrollments_program   ON enrollments(program_id);
CREATE INDEX idx_enrollments_member    ON enrollments(member_id);
CREATE INDEX idx_ledger_member_id      ON ledger(member_id);
CREATE INDEX idx_ledger_masjid_id      ON ledger(masjid_id);
CREATE INDEX idx_receipts_member_id    ON receipts(member_id);
CREATE INDEX idx_receipts_masjid_id    ON receipts(masjid_id);
