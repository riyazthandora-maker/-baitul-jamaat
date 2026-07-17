-- =============================================================
-- Migration 009: One-time donations from non-members
-- =============================================================

CREATE TABLE donations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  donor_name     TEXT NOT NULL,
  donor_phone    TEXT,
  donor_email    TEXT,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  purpose        TEXT,
  receipt_number TEXT NOT NULL,
  voided_at      TIMESTAMPTZ,
  void_reason    TEXT
);

CREATE INDEX idx_donations_masjid_id ON donations(masjid_id);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to donations"
  ON donations FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own donations"
  ON donations FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());
