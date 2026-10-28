-- Backfill transaction_date on existing receipt payments so ledger, statements
-- and reports use the same date that is printed on the receipt.
UPDATE ledger l
SET transaction_date = r.receipt_date
FROM receipts r
WHERE l.receipt_id = r.id
  AND l.transaction_date IS NULL;
