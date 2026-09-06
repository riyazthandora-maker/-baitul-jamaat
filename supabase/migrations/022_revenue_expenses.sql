-- =============================================================
-- Migration 022: Revenue & Expense subsystem
-- Tables  : contacts, revenue_expenses
-- Columns : revenue_seq + expense_seq added to masjids
-- Functions: next_revenue_receipt_number(), next_expense_voucher_number()
-- RLS      : contacts, revenue_expenses
-- Indexes  : performance indexes for list/filter queries
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Add per-masjid sequence counters to masjids
-- ---------------------------------------------------------------
ALTER TABLE masjids
  ADD COLUMN IF NOT EXISTS revenue_seq INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_seq INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------
-- 2. contacts  (external vendors / customers)
--    Not members — these are arbitrary third-party entities.
--    Soft-active via is_active; never hard-deleted.
-- ---------------------------------------------------------------
CREATE TABLE contacts (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id  UUID        NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT,
  phone      TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- 3. revenue_expenses  (unified revenue + expense ledger)
--
--    entity_type / entity_id form a polymorphic reference:
--      'member'  → members.id
--      'contact' → contacts.id
--    No FK constraint (two possible targets); enforced by app layer.
--
--    Soft delete: deleted_at IS NOT NULL means deleted.
--    Immutable financial amounts: no UPDATE on amount after creation.
-- ---------------------------------------------------------------
CREATE TYPE re_type AS ENUM ('revenue', 'expense');

CREATE TABLE revenue_expenses (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  masjid_id      UUID         NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,

  type           re_type      NOT NULL,
  date           DATE         NOT NULL,

  -- Entity
  entity_type    TEXT         NOT NULL CHECK (entity_type IN ('member', 'contact')),
  entity_id      UUID         NOT NULL,

  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  remarks        TEXT,

  -- Revenue-specific
  is_received    BOOLEAN      NOT NULL DEFAULT FALSE,
  receipt_number TEXT,

  -- Expense-specific
  is_paid        BOOLEAN      NOT NULL DEFAULT FALSE,
  voucher_number TEXT,

  -- Soft delete
  deleted_at     TIMESTAMPTZ,

  -- Audit
  created_by     UUID         REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT receipt_number_unique UNIQUE (masjid_id, receipt_number),
  CONSTRAINT voucher_number_unique UNIQUE (masjid_id, voucher_number)
);

-- ---------------------------------------------------------------
-- 4. updated_at auto-maintenance trigger
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revenue_expenses_updated_at
  BEFORE UPDATE ON revenue_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- 5. Atomically increment revenue_seq and return receipt number
--    Format: REC-{YEAR}-{5-digit seq}  e.g. REC-2026-00001
--    p_year comes from the transaction date (client supplies it)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_revenue_receipt_number(
  p_masjid_id UUID,
  p_year      INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  UPDATE masjids
  SET    revenue_seq = revenue_seq + 1
  WHERE  id = p_masjid_id
  RETURNING revenue_seq INTO v_seq;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;

  RETURN 'REC-' || p_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ---------------------------------------------------------------
-- 6. Atomically increment expense_seq and return voucher number
--    Format: VOU-{YEAR}-{5-digit seq}  e.g. VOU-2026-00001
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_expense_voucher_number(
  p_masjid_id UUID,
  p_year      INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  UPDATE masjids
  SET    expense_seq = expense_seq + 1
  WHERE  id = p_masjid_id
  RETURNING expense_seq INTO v_seq;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;

  RETURN 'VOU-' || p_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ---------------------------------------------------------------
-- 7. RLS — contacts
-- ---------------------------------------------------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to contacts"
  ON contacts FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own contacts"
  ON contacts FOR ALL
  USING  (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

-- ---------------------------------------------------------------
-- 8. RLS — revenue_expenses
-- ---------------------------------------------------------------
ALTER TABLE revenue_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to revenue_expenses"
  ON revenue_expenses FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own revenue_expenses"
  ON revenue_expenses FOR ALL
  USING  (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

-- ---------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------

-- contacts: active lookup for entity select dropdowns
CREATE INDEX idx_contacts_masjid_active
  ON contacts(masjid_id, is_active, name);

-- contacts: name search (trigram) for autocomplete
CREATE INDEX idx_contacts_name_trgm
  ON contacts USING gin (name gin_trgm_ops);

-- revenue_expenses: primary list query (per masjid, newest first, non-deleted)
CREATE INDEX idx_re_masjid_date
  ON revenue_expenses(masjid_id, date DESC)
  WHERE deleted_at IS NULL;

-- revenue_expenses: filter by type
CREATE INDEX idx_re_masjid_type_date
  ON revenue_expenses(masjid_id, type, date DESC)
  WHERE deleted_at IS NULL;

-- revenue_expenses: entity lookups (member ledger link)
CREATE INDEX idx_re_entity
  ON revenue_expenses(entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- revenue_expenses: status filters
CREATE INDEX idx_re_masjid_received
  ON revenue_expenses(masjid_id, is_received)
  WHERE type = 'revenue' AND deleted_at IS NULL;

CREATE INDEX idx_re_masjid_paid
  ON revenue_expenses(masjid_id, is_paid)
  WHERE type = 'expense' AND deleted_at IS NULL;

-- receipt/voucher number lookup (re-send, search)
CREATE INDEX idx_re_receipt_number ON revenue_expenses(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX idx_re_voucher_number ON revenue_expenses(voucher_number) WHERE voucher_number IS NOT NULL;
