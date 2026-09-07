-- =============================================================
-- Migration 029: Revenue Items (service fee codes) +
--                ad-hoc member charge recording
-- =============================================================
-- Adds:
--   revenue_items   — fee code registry (nikkah fee, house warming, etc.)
--   ledger.transaction_date  — user-supplied service date (nullable,
--                              backward-compat; existing rows keep NULL)
--   ledger.revenue_item_id   — FK to the item used for ad-hoc charges
--   record_member_revenue()  — atomic insert function
-- =============================================================

-- ── 1. revenue_items ─────────────────────────────────────────
CREATE TABLE revenue_items (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  masjid_id      UUID         NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  code           TEXT         NOT NULL,        -- short tag: NIKKAH, HOUSE-WARMING
  name           TEXT         NOT NULL,        -- display: "Nikkah Registration Fee"
  default_amount NUMERIC(10,2) NOT NULL CHECK (default_amount > 0),
  description    TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT revenue_items_code_unique UNIQUE (masjid_id, code)
);

-- ── 2. Extend ledger ─────────────────────────────────────────
ALTER TABLE ledger
  ADD COLUMN IF NOT EXISTS transaction_date DATE,          -- service date (user-provided)
  ADD COLUMN IF NOT EXISTS revenue_item_id  UUID
    REFERENCES revenue_items(id) ON DELETE SET NULL;       -- NULL for program charges

-- ── 3. RLS — revenue_items ───────────────────────────────────
ALTER TABLE revenue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to revenue_items"
  ON revenue_items FOR ALL
  USING  (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own revenue_items"
  ON revenue_items FOR ALL
  USING  (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

-- ── 4. Atomic insert function ─────────────────────────────────
CREATE OR REPLACE FUNCTION record_member_revenue(
  p_masjid_id      UUID,
  p_actor_id       UUID,
  p_member_id      UUID,
  p_revenue_item_id UUID,
  p_date           DATE,
  p_amount         NUMERIC,
  p_description    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry ledger;
  v_item  revenue_items;
BEGIN
  -- Validate member belongs to this masjid and is a recognised member
  IF NOT EXISTS (
    SELECT 1 FROM members
    WHERE id = p_member_id
      AND masjid_id = p_masjid_id
      AND status IN ('active', 'inactive')
  ) THEN
    RAISE EXCEPTION 'Member not found or not eligible for charges';
  END IF;

  -- Validate revenue item belongs to this masjid and is active
  SELECT * INTO v_item
  FROM revenue_items
  WHERE id = p_revenue_item_id
    AND masjid_id = p_masjid_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revenue item not found or inactive';
  END IF;

  -- Insert ledger charge
  INSERT INTO ledger (
    masjid_id, member_id, revenue_item_id,
    type, amount, description, transaction_date
  ) VALUES (
    p_masjid_id,
    p_member_id,
    p_revenue_item_id,
    'charge',
    p_amount,
    COALESCE(NULLIF(TRIM(p_description), ''), v_item.name),
    p_date
  )
  RETURNING * INTO v_entry;

  -- Audit log
  INSERT INTO audit_log (
    masjid_id, actor_id, table_name, record_id, action, after_data
  ) VALUES (
    p_masjid_id,
    p_actor_id,
    'ledger',
    v_entry.id::TEXT,
    'record_member_revenue',
    to_jsonb(v_entry)
  );

  RETURN to_jsonb(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION record_member_revenue(UUID, UUID, UUID, UUID, DATE, NUMERIC, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION record_member_revenue(UUID, UUID, UUID, UUID, DATE, NUMERIC, TEXT) TO service_role;

-- ── 5. Indexes ────────────────────────────────────────────────
-- Item code list for dropdowns (active items first, sorted by code)
CREATE INDEX idx_revenue_items_masjid_active
  ON revenue_items(masjid_id, is_active, code);

-- Ledger lookups by revenue_item (admin reporting)
CREATE INDEX idx_ledger_revenue_item
  ON ledger(revenue_item_id)
  WHERE revenue_item_id IS NOT NULL;
