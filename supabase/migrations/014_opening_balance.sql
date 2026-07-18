-- =============================================================
-- Migration 014: Add opening_balance ledger type for data migration
-- =============================================================

-- Extend the type CHECK constraint to include opening_balance
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_type_check;
ALTER TABLE ledger ADD CONSTRAINT ledger_type_check
  CHECK (type IN ('charge', 'discount', 'payment', 'opening_balance'));
