-- =============================================================
-- Migration 021: fix bulk_import_members() empty opening_balance
-- COALESCE only catches NULL, not empty string; use NULLIF first.
-- =============================================================

CREATE OR REPLACE FUNCTION bulk_import_members(
  p_masjid_id UUID,
  p_rows      JSONB,
  p_actor_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row            JSONB;
  v_member_id      UUID;
  v_member_number  TEXT;
  v_opening_bal    NUMERIC(10,2);
  v_results        JSONB := '[]'::JSONB;
  v_result         JSONB;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_member_id     := gen_random_uuid();
      v_opening_bal   := COALESCE(NULLIF(TRIM(v_row->>'opening_balance'), '')::NUMERIC, 0);

      -- Atomically get the next member number
      SELECT next_member_number(p_masjid_id) INTO v_member_number;

      INSERT INTO members (
        id,
        masjid_id,
        full_name,
        phone,
        email,
        dob,
        gender,
        address,
        qualification,
        id_type,
        id_last4,
        status,
        member_number,
        created_at
      ) VALUES (
        v_member_id,
        p_masjid_id,
        v_row->>'full_name',
        v_row->>'phone',
        NULLIF(v_row->>'email', ''),
        NULLIF(v_row->>'date_of_birth', '')::DATE,
        NULLIF(v_row->>'gender', ''),
        NULLIF(v_row->>'address', ''),
        v_row->>'qualification',
        NULLIF(v_row->>'id_type', ''),
        NULLIF(v_row->>'id_last4', ''),
        'active',
        v_member_number,
        NOW()
      );

      IF v_opening_bal > 0 THEN
        INSERT INTO ledger (
          id,
          masjid_id,
          member_id,
          type,
          amount,
          description,
          period_key,
          created_at
        ) VALUES (
          gen_random_uuid(),
          p_masjid_id,
          v_member_id,
          'opening_balance',
          v_opening_bal,
          'Opening balance (bulk import)',
          'ob:' || v_member_id::TEXT,
          NOW()
        );
      END IF;

      INSERT INTO audit_log (
        masjid_id,
        actor_id,
        table_name,
        record_id,
        action,
        after_data
      ) VALUES (
        p_masjid_id,
        p_actor_id,
        'members',
        v_member_id::TEXT,
        'bulk_import',
        v_row
      );

      v_result := jsonb_build_object(
        'member_id',            v_member_id,
        'member_number',        v_member_number,
        'phone',                v_row->>'phone',
        'full_name',            v_row->>'full_name',
        'opening_balance_added', v_opening_bal > 0,
        'success',              true,
        'error',                null
      );

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_build_object(
        'member_id',            null,
        'member_number',        null,
        'phone',                v_row->>'phone',
        'full_name',            v_row->>'full_name',
        'opening_balance_added', false,
        'success',              false,
        'error',                SQLERRM
      );
    END;

    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  RETURN v_results;
END;
$$;
