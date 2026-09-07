-- =============================================================
-- Migration 026: Finance — contacts only
--
-- 1. Create contact records for any members currently linked to
--    revenue_expense rows (avoids data loss).
-- 2. Re-point those rows to the new contacts.
-- 3. Tighten the CHECK constraint to reject 'member' going forward.
-- 4. Replace create_revenue_expense() RPC — removes member branch
--    and the member-ledger double-entry that went with it.
-- =============================================================

BEGIN;

-- ---------------------------------------------------------------
-- Step 1 — Create contacts from members that have finance entries.
-- Only insert if no contact with the same name + matching phone OR
-- email already exists for that masjid.
-- DISTINCT ON (masjid_id, entity_id) ensures one contact per
-- unique member per masjid even if they appear in multiple rows.
-- ---------------------------------------------------------------
INSERT INTO contacts (masjid_id, name, email, phone)
SELECT DISTINCT ON (re.masjid_id, re.entity_id)
  re.masjid_id,
  m.full_name,
  m.email,
  m.phone
FROM revenue_expenses re
JOIN members m
  ON m.id = re.entity_id
 AND m.masjid_id = re.masjid_id
WHERE re.entity_type = 'member'
  AND re.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM contacts c
    WHERE c.masjid_id = re.masjid_id
      AND c.name = m.full_name
      AND (
        (c.phone IS NOT DISTINCT FROM m.phone)
        OR (c.email IS NOT DISTINCT FROM m.email AND m.email IS NOT NULL)
      )
  );

-- ---------------------------------------------------------------
-- Step 2 — Re-link rows: entity_type → 'contact', entity_id → the
-- matching contact's id.
-- Priority: exact name+phone+email > name+phone > name+email > name.
-- ---------------------------------------------------------------
UPDATE revenue_expenses re
SET
  entity_type = 'contact',
  entity_id   = (
    SELECT c.id
    FROM contacts c
    JOIN members m
      ON m.id = re.entity_id
     AND m.masjid_id = re.masjid_id
    WHERE c.masjid_id = re.masjid_id
      AND c.name = m.full_name
    ORDER BY
      CASE
        WHEN c.phone IS NOT DISTINCT FROM m.phone
         AND c.email IS NOT DISTINCT FROM m.email THEN 0
        WHEN c.phone IS NOT DISTINCT FROM m.phone  THEN 1
        WHEN c.email IS NOT DISTINCT FROM m.email
         AND m.email IS NOT NULL                   THEN 2
        ELSE 3
      END
    LIMIT 1
  )
WHERE re.entity_type = 'member';

-- ---------------------------------------------------------------
-- Step 3 — Tighten CHECK constraint to 'contact' only.
-- ---------------------------------------------------------------
ALTER TABLE revenue_expenses
  DROP CONSTRAINT IF EXISTS revenue_expenses_entity_type_check;

ALTER TABLE revenue_expenses
  ADD CONSTRAINT revenue_expenses_entity_type_check
  CHECK (entity_type IN ('contact'));

-- ---------------------------------------------------------------
-- Step 4 — Replace create_revenue_expense():
--   • Removes member validation branch
--   • Removes member ledger double-entry (charge + payment)
--   • Hardcodes entity_type = 'contact' in the INSERT
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_revenue_expense(
  p_masjid_id    UUID,
  p_actor_id     UUID,
  p_type         re_type,
  p_date         DATE,
  p_entity_type  TEXT,
  p_entity_id    UUID,
  p_amount       NUMERIC(10,2),
  p_remarks      TEXT,
  p_is_received  BOOLEAN,
  p_is_paid      BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry          revenue_expenses;
  v_receipt_number TEXT := NULL;
  v_voucher_number TEXT := NULL;
  v_year           INTEGER := EXTRACT(YEAR FROM p_date)::INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_entity_type <> 'contact' THEN
    RAISE EXCEPTION 'Only external contacts are supported for finance entries';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM contacts
    WHERE id = p_entity_id
      AND masjid_id = p_masjid_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Active contact not found';
  END IF;

  IF p_type = 'revenue' AND p_is_received THEN
    SELECT next_revenue_receipt_number(p_masjid_id, v_year)
      INTO v_receipt_number;
  ELSIF p_type = 'expense' AND p_is_paid THEN
    SELECT next_expense_voucher_number(p_masjid_id, v_year)
      INTO v_voucher_number;
  END IF;

  INSERT INTO revenue_expenses (
    masjid_id, type, date, entity_type, entity_id, amount, remarks,
    is_received, is_paid, receipt_number, voucher_number, created_by
  ) VALUES (
    p_masjid_id, p_type, p_date, 'contact', p_entity_id, p_amount, p_remarks,
    CASE WHEN p_type = 'revenue' THEN p_is_received ELSE FALSE END,
    CASE WHEN p_type = 'expense' THEN p_is_paid     ELSE FALSE END,
    v_receipt_number, v_voucher_number, p_actor_id
  )
  RETURNING * INTO v_entry;

  INSERT INTO audit_log (
    masjid_id, actor_id, table_name, record_id, action, after_data
  ) VALUES (
    p_masjid_id, p_actor_id, 'revenue_expenses', v_entry.id::TEXT,
    'insert', to_jsonb(v_entry)
  );

  RETURN to_jsonb(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION create_revenue_expense(UUID, UUID, re_type, DATE, TEXT, UUID, NUMERIC, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_revenue_expense(UUID, UUID, re_type, DATE, TEXT, UUID, NUMERIC, TEXT, BOOLEAN, BOOLEAN) TO service_role;

COMMIT;
