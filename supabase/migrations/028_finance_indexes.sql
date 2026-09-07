-- =============================================================
-- Migration 028: Finance module — targeted performance indexes
-- =============================================================
-- Four problems addressed:
--
-- 1. LIST SORT INSTABILITY
--    idx_re_masjid_type_date was (masjid_id, type, date DESC).
--    The API query orders by (date DESC, created_at DESC). When two
--    rows share the same date Postgres cannot satisfy created_at
--    from the index and performs an extra in-memory sort.
--    Fix: add created_at DESC as the tiebreaker column.
--
-- 2. STATUS FILTER + ORDER BY MISMATCH
--    idx_re_masjid_received/paid were (masjid_id, is_received/is_paid)
--    with no date column. When a status filter is active the planner
--    fetches matching rows from those indexes then sorts them by date
--    in a separate step — effectively a partial-index scan + sort.
--    Fix: promote to (masjid_id, is_X, date DESC, created_at DESC)
--    so the planner gets sorted rows directly.
--
-- 3. TOTALS QUERY HEAP ACCESS
--    The parallel totals query introduced in the finance module
--    runs SELECT type, amount … for all matching rows.  Without a
--    covering index Postgres visits every heap page to read those
--    two columns.  A covering partial index avoids heap touches
--    entirely for the most common unfiltered case.
--
-- 4. RECEIPTS PAGE SORT COLUMN MISMATCH
--    The "External Contact Receipts" page queries
--    ORDER BY created_at DESC, but every existing index sorts by
--    date DESC.  Postgres cannot use those for ordering and falls
--    back to a sequential sort.
-- =============================================================

-- ── 1. Main list: stable sort (date + created_at) ────────────
-- Drop the two date-only composites and replace with versions
-- that include created_at so the ORDER BY is index-native.

DROP INDEX IF EXISTS idx_re_masjid_date;
DROP INDEX IF EXISTS idx_re_masjid_type_date;

CREATE INDEX idx_re_masjid_date_created
  ON revenue_expenses(masjid_id, date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_re_masjid_type_date_created
  ON revenue_expenses(masjid_id, type, date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── 2. Status filters with ORDER BY support ───────────────────
-- Replace the bare status indexes with composites that also
-- drive the date/created_at sort, eliminating the extra sort step.

DROP INDEX IF EXISTS idx_re_masjid_received;
DROP INDEX IF EXISTS idx_re_masjid_paid;

CREATE INDEX idx_re_revenue_status_date
  ON revenue_expenses(masjid_id, is_received, date DESC, created_at DESC)
  WHERE type = 'revenue' AND deleted_at IS NULL;

CREATE INDEX idx_re_expense_status_date
  ON revenue_expenses(masjid_id, is_paid, date DESC, created_at DESC)
  WHERE type = 'expense' AND deleted_at IS NULL;

-- ── 3. Totals query covering index (index-only scan) ─────────
-- SELECT type, amount WHERE masjid_id=? AND deleted_at IS NULL
-- All three projected columns are in the index key, so Postgres
-- can answer the query without visiting the heap.

CREATE INDEX IF NOT EXISTS idx_re_totals_cover
  ON revenue_expenses(masjid_id, type, amount)
  WHERE deleted_at IS NULL;

-- ── 4. Receipts page: created_at ordering ────────────────────
-- The external-contact receipts page filters on type='revenue',
-- receipt_number IS NOT NULL, entity_type='contact' and orders
-- by created_at DESC.  This partial index covers all four.

CREATE INDEX IF NOT EXISTS idx_re_contact_receipts
  ON revenue_expenses(masjid_id, entity_type, created_at DESC)
  WHERE type = 'revenue' AND receipt_number IS NOT NULL AND deleted_at IS NULL;
