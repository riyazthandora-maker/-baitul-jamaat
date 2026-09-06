-- =============================================================
-- Migration 023: atomic revenue/expense creation
-- =============================================================

CREATE OR REPLACE FUNCTION create_revenue_expense(
  p_masjid_id    UUID,
  p_actor_id      UUID,
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

  IF p_entity_type = 'member' THEN
    IF NOT EXISTS (
      SELECT 1 FROM members
      WHERE id = p_entity_id
        AND masjid_id = p_masjid_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Active member not found';
    END IF;
  ELSIF p_entity_type = 'contact' THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts
      WHERE id = p_entity_id
        AND masjid_id = p_masjid_id
        AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Active contact not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid entity type';
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
    p_masjid_id, p_type, p_date, p_entity_type, p_entity_id, p_amount, p_remarks,
    CASE WHEN p_type = 'revenue' THEN p_is_received ELSE FALSE END,
    CASE WHEN p_type = 'expense' THEN p_is_paid ELSE FALSE END,
    v_receipt_number, v_voucher_number, p_actor_id
  )
  RETURNING * INTO v_entry;

  IF p_type = 'revenue' AND p_entity_type = 'member' THEN
    INSERT INTO ledger (masjid_id, member_id, type, amount, description)
    VALUES (
      p_masjid_id,
      p_entity_id,
      'charge',
      p_amount,
      COALESCE('Revenue charge — ' || v_receipt_number, 'Revenue demand — ' || p_date::TEXT)
    );

    IF p_is_received THEN
      INSERT INTO ledger (masjid_id, member_id, type, amount, description)
      VALUES (p_masjid_id, p_entity_id, 'payment', p_amount,
              'Payment received — ' || COALESCE(v_receipt_number, p_date::TEXT));
    END IF;
  END IF;

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
