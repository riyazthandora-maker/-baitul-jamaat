-- Migration 016: OTP codes for admin/super-admin 2-factor login

CREATE TABLE admin_otps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,        -- SHA-256 hex of the 6-digit code
  expires_at  TIMESTAMPTZ NOT NULL, -- 10 minutes from creation
  attempts    SMALLINT NOT NULL DEFAULT 0,
  used        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_admin_otps_user_id ON admin_otps(user_id);

ALTER TABLE admin_otps ENABLE ROW LEVEL SECURITY;
-- All access via service role only; no user-visible policies needed.
