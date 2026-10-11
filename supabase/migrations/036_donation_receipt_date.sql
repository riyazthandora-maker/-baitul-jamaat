-- Add receipt_date to donations to allow backdating within the past month.
-- Backfill existing rows from created_at so historical dates are preserved.
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS receipt_date date;

UPDATE donations
  SET receipt_date = created_at::date
  WHERE receipt_date IS NULL;

ALTER TABLE donations
  ALTER COLUMN receipt_date SET NOT NULL,
  ALTER COLUMN receipt_date SET DEFAULT CURRENT_DATE;
