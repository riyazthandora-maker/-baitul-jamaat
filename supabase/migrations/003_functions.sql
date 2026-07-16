-- =============================================================
-- Migration 003: Postgres functions
-- =============================================================

-- ---------------------------------------------------------------
-- Atomically increment member_seq and return formatted number
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_member_number(p_masjid_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    INTEGER;
  v_code   TEXT;
BEGIN
  UPDATE masjids
  SET    member_seq = member_seq + 1
  WHERE  id = p_masjid_id
  RETURNING member_seq, masjid_code
  INTO   v_seq, v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;

  RETURN 'M-' || v_code || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ---------------------------------------------------------------
-- Atomically increment receipt_seq and return formatted number
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_receipt_number(p_masjid_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    INTEGER;
  v_code   TEXT;
BEGIN
  UPDATE masjids
  SET    receipt_seq = receipt_seq + 1
  WHERE  id = p_masjid_id
  RETURNING receipt_seq, masjid_code
  INTO   v_seq, v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Masjid not found: %', p_masjid_id;
  END IF;

  RETURN 'R-' || v_code || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ---------------------------------------------------------------
-- Trigger: auto-create profile on Supabase Auth user creation
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, masjid_id, role, full_name, phone, force_password_change)
  VALUES (
    NEW.id,
    NULLIF((NEW.raw_app_meta_data ->> 'masjid_id'), '')::UUID,
    COALESCE((NEW.raw_app_meta_data ->> 'role')::user_role, 'member'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_app_meta_data ->> 'force_password_change')::BOOLEAN, FALSE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
