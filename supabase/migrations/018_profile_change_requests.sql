-- =============================================================
-- Migration 018: profile_change_requests
-- Stores member-submitted profile edit requests pending admin approval
-- =============================================================

CREATE TABLE profile_change_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id     UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  changes       JSONB NOT NULL,
  new_photo_url TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reject_reason TEXT
);

-- One active pending request per member at a time
CREATE UNIQUE INDEX idx_profile_change_requests_pending
  ON profile_change_requests(member_id)
  WHERE status = 'pending';

CREATE INDEX idx_profile_change_requests_member ON profile_change_requests(member_id);
CREATE INDEX idx_profile_change_requests_masjid ON profile_change_requests(masjid_id);

ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to change requests"
  ON profile_change_requests FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own masjid change requests"
  ON profile_change_requests FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "member: read own change requests"
  ON profile_change_requests FOR SELECT
  USING (
    auth_role() = 'member'
    AND member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );

CREATE POLICY "member: insert own change request"
  ON profile_change_requests FOR INSERT
  WITH CHECK (
    auth_role() = 'member'
    AND member_id IN (SELECT id FROM members WHERE profile_id = auth.uid())
  );
