-- =============================================================
-- Migration 019: split "qualification" into qualification + job
-- -------------------------------------------------------------
-- 1) Adds a nullable `job` TEXT column.
-- 2) Remaps existing values to the new strict qualification list
--    (Basic education / SSLC / Plus 2 / Diploma / Degree /
--    Masters / Doctorate) and moves old job values (plus any
--    free-text "Other" entries) into `job`.
-- 3) Rebuilds bulk_import_members() to accept `job`.
-- =============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS job TEXT;

-- Move old job values (and any free-text "Other" entries) into job;
-- map old education values to the new strict list; clear the rest.
UPDATE members
SET
  job = CASE
    WHEN qualification IN (
      'Engineer','Doctor','Teacher','Business','Farmer','Driver',
      'Skilled Worker','House Wife','Homemaker','Student',
      'Accountant','Nurse','Software Engineer','Retired','Other'
    ) THEN qualification
    WHEN qualification NOT IN (
      'Below 10th Grade','10th Pass','10th Grade','12th Pass','12th Grade',
      'Diploma','Graduate','Post Graduate','Doctorate',
      'Basic education','SSLC','Plus 2',
      'Degree (BA/BSc/MBBS/BTech, etc.)','Degree (BA/BSc/MBBS/BTech etc.)','Masters'
    ) THEN qualification
    ELSE job
  END,
  qualification = CASE qualification
    WHEN 'Below 10th Grade' THEN 'Basic education'
    WHEN '10th Pass'        THEN 'SSLC'
    WHEN '10th Grade'       THEN 'SSLC'
    WHEN '12th Pass'        THEN 'Plus 2'
    WHEN '12th Grade'       THEN 'Plus 2'
    WHEN 'Diploma'          THEN 'Diploma'
    WHEN 'Graduate'         THEN 'Degree (BA/BSc/MBBS/BTech etc.)'
    WHEN 'Post Graduate'    THEN 'Masters'
    WHEN 'Doctorate'        THEN 'Doctorate'
    WHEN 'Degree (BA/BSc/MBBS/BTech, etc.)' THEN 'Degree (BA/BSc/MBBS/BTech etc.)'
    WHEN 'Basic education'  THEN 'Basic education'
    WHEN 'SSLC'             THEN 'SSLC'
    WHEN 'Plus 2'           THEN 'Plus 2'
    WHEN 'Degree (BA/BSc/MBBS/BTech etc.)' THEN 'Degree (BA/BSc/MBBS/BTech etc.)'
    WHEN 'Masters'          THEN 'Masters'
    ELSE NULL
  END
WHERE qualification IS NOT NULL;

-- =============================================================
-- Rebuild bulk_import_members() to include the job column
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
      v_opening_bal   := COALESCE((v_row->>'opening_balance')::NUMERIC, 0);

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
        job,
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
        NULLIF(v_row->>'job', ''),
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
