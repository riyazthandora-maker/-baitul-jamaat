-- =============================================================
-- Migration 025: external receipt generation marks revenue as paid
-- =============================================================

CREATE OR REPLACE FUNCTION generate_external_revenue_receipt(
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
  v_receipt_number TEXT;
BEGIN
  SELECT * INTO v_entry
  FROM revenue_expenses
  WHERE id = p_entry_id
    AND masjid_id = p_masjid_id
    AND type = 'revenue'
    AND entity_type = 'contact'
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending external revenue entry not found';
  END IF;

  IF v_entry.receipt_number IS NOT NULL THEN
    IF NOT v_entry.is_received THEN
      UPDATE revenue_expenses
      SET is_received = TRUE
      WHERE id = p_entry_id
      RETURNING * INTO v_entry;

      INSERT INTO audit_log (
        masjid_id, actor_id, table_name, record_id, action, before_data, after_data
      ) VALUES (
        p_masjid_id,
        p_actor_id,
        'revenue_expenses',
        p_entry_id::TEXT,
        'generate_receipt',
        jsonb_build_object('receipt_number', v_entry.receipt_number, 'is_received', FALSE),
        to_jsonb(v_entry)
      );
    END IF;
    RETURN to_jsonb(v_entry);
  END IF;

  SELECT next_revenue_receipt_number(
    p_masjid_id,
    EXTRACT(YEAR FROM v_entry.date)::INTEGER
  ) INTO v_receipt_number;

  -- Receipt number and paid status change together only after numbering succeeds.
  UPDATE revenue_expenses
  SET receipt_number = v_receipt_number,
      is_received = TRUE
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  INSERT INTO audit_log (
    masjid_id, actor_id, table_name, record_id, action, before_data, after_data
  ) VALUES (
    p_masjid_id,
    p_actor_id,
    'revenue_expenses',
    p_entry_id::TEXT,
    'generate_receipt',
    jsonb_build_object('receipt_number', NULL, 'is_received', FALSE),
    to_jsonb(v_entry)
  );

  RETURN to_jsonb(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION generate_external_revenue_receipt(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_external_revenue_receipt(UUID, UUID, UUID) TO service_role;
