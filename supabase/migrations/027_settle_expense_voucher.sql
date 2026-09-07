-- =============================================================
-- Migration 027: settle_expense_voucher()
-- Atomically marks a payable expense as paid and generates a
-- voucher number. Mirrors generate_external_revenue_receipt()
-- for the expense side.
-- =============================================================

CREATE OR REPLACE FUNCTION settle_expense_voucher(
  p_masjid_id UUID,
  p_actor_id  UUID,
  p_entry_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry          revenue_expenses;
  v_voucher_number TEXT;
BEGIN
  SELECT * INTO v_entry
  FROM revenue_expenses
  WHERE id         = p_entry_id
    AND masjid_id  = p_masjid_id
    AND type       = 'expense'
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense entry not found';
  END IF;

  -- Idempotent: already settled
  IF v_entry.is_paid AND v_entry.voucher_number IS NOT NULL THEN
    RETURN to_jsonb(v_entry);
  END IF;

  SELECT next_expense_voucher_number(
    p_masjid_id,
    EXTRACT(YEAR FROM v_entry.date)::INTEGER
  ) INTO v_voucher_number;

  UPDATE revenue_expenses
  SET is_paid        = TRUE,
      voucher_number = v_voucher_number
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO audit_log (
    masjid_id, actor_id, table_name, record_id, action, before_data, after_data
  ) VALUES (
    p_masjid_id, p_actor_id, 'revenue_expenses', p_entry_id::TEXT,
    'settle_expense',
    jsonb_build_object('is_paid', FALSE, 'voucher_number', NULL),
    to_jsonb(v_entry)
  );

  RETURN to_jsonb(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION settle_expense_voucher(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_expense_voucher(UUID, UUID, UUID) TO service_role;
