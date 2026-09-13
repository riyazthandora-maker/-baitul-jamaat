-- =============================================================
-- Migration 034: Add 'on_demand' recurrence type to programs
-- =============================================================

ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_recurrence_check;
ALTER TABLE programs ADD CONSTRAINT programs_recurrence_check
  CHECK (recurrence IN ('monthly', 'yearly', 'on_demand'));
