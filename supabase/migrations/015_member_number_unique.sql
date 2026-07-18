-- =============================================================
-- Migration 015: Unique index on members.member_number
-- Enforces DB-level uniqueness so member ID login lookup is safe
-- =============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_member_number
  ON members(member_number)
  WHERE member_number IS NOT NULL;
