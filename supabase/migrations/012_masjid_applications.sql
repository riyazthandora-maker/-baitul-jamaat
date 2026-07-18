-- Masjid registration applications submitted from the landing page
CREATE TABLE IF NOT EXISTS masjid_applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name         TEXT NOT NULL,
  address      TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at  TIMESTAMPTZ,
  notes        TEXT,
  ip_hash      TEXT
);

-- One application per email address
CREATE UNIQUE INDEX IF NOT EXISTS masjid_applications_email_idx
  ON masjid_applications (lower(email));

ALTER TABLE masjid_applications ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read/update/delete; inserts are done via service role in the API
CREATE POLICY "superadmin_all_masjid_applications"
  ON masjid_applications FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');
