-- =============================================================
-- Migration 033: Fix ORDER BY column references in report functions
-- The three functions below had ORDER BY clauses referencing
-- RETURNS TABLE column names instead of explicit SELECT aliases.
-- PostgreSQL LANGUAGE SQL functions require the aliases to exist
-- in the SELECT list itself.
-- =============================================================

-- ── 4. Service fee summary (fixed) ───────────────────────────
CREATE OR REPLACE FUNCTION get_service_fee_summary(
  p_masjid_id UUID,
  p_from      DATE DEFAULT NULL,
  p_to        DATE DEFAULT NULL
)
RETURNS TABLE (
  item_id       UUID,
  code          TEXT,
  name          TEXT,
  is_active     BOOLEAN,
  charge_count  BIGINT,
  total_charged NUMERIC
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ri.id                        AS item_id,
    ri.code,
    ri.name,
    ri.is_active,
    COUNT(l.id)::BIGINT          AS charge_count,
    COALESCE(SUM(l.amount), 0)   AS total_charged
  FROM revenue_items ri
  LEFT JOIN ledger l ON l.revenue_item_id = ri.id
    AND l.type = 'charge' AND l.voided_at IS NULL
    AND (p_from IS NULL OR COALESCE(l.transaction_date, l.created_at::date) >= p_from)
    AND (p_to   IS NULL OR COALESCE(l.transaction_date, l.created_at::date) <= p_to)
  WHERE ri.masjid_id = p_masjid_id
  GROUP BY ri.id, ri.code, ri.name, ri.is_active
  ORDER BY total_charged DESC, ri.code;
$$;

REVOKE ALL ON FUNCTION get_service_fee_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_service_fee_summary(UUID, DATE, DATE) TO service_role;

-- ── 5. Collections summary (fixed) ───────────────────────────
CREATE OR REPLACE FUNCTION get_collections_summary(
  p_masjid_id UUID,
  p_from      DATE DEFAULT NULL,
  p_to        DATE DEFAULT NULL
)
RETURNS TABLE (source TEXT, txn_count BIGINT, total NUMERIC)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'Member Payments'::TEXT            AS source,
    COUNT(*)::BIGINT                        AS txn_count,
    COALESCE(SUM(l.amount), 0)             AS total
  FROM ledger l
  WHERE l.masjid_id = p_masjid_id AND l.type = 'payment' AND l.voided_at IS NULL
    AND (p_from IS NULL OR COALESCE(l.transaction_date, l.created_at::date) >= p_from)
    AND (p_to   IS NULL OR COALESCE(l.transaction_date, l.created_at::date) <= p_to)

  UNION ALL

  SELECT 'Contact Revenue'::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(re.amount), 0)
  FROM revenue_expenses re
  WHERE re.masjid_id = p_masjid_id AND re.type = 'revenue'
    AND re.is_received = TRUE AND re.deleted_at IS NULL
    AND (p_from IS NULL OR re.date >= p_from)
    AND (p_to   IS NULL OR re.date <= p_to)

  UNION ALL

  SELECT 'Donations'::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(d.amount), 0)
  FROM donations d
  WHERE d.masjid_id = p_masjid_id AND d.voided_at IS NULL
    AND (p_from IS NULL OR d.created_at::date >= p_from)
    AND (p_to   IS NULL OR d.created_at::date <= p_to)

  ORDER BY 3 DESC;
$$;

REVOKE ALL ON FUNCTION get_collections_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_collections_summary(UUID, DATE, DATE) TO service_role;

-- ── 6. Expense by contact (fixed) ────────────────────────────
CREATE OR REPLACE FUNCTION get_expense_by_contact(
  p_masjid_id UUID,
  p_from      DATE DEFAULT NULL,
  p_to        DATE DEFAULT NULL
)
RETURNS TABLE (
  contact_id    UUID,
  contact_name  TEXT,
  expense_count BIGINT,
  total_paid    NUMERIC,
  latest_date   DATE
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id                        AS contact_id,
    c.name                      AS contact_name,
    COUNT(re.id)::BIGINT        AS expense_count,
    COALESCE(SUM(re.amount), 0) AS total_paid,
    MAX(re.date)                AS latest_date
  FROM revenue_expenses re
  JOIN contacts c ON c.id = re.entity_id AND re.entity_type = 'contact'
  WHERE re.masjid_id = p_masjid_id AND re.type = 'expense'
    AND re.is_paid = TRUE AND re.deleted_at IS NULL
    AND (p_from IS NULL OR re.date >= p_from)
    AND (p_to   IS NULL OR re.date <= p_to)
  GROUP BY c.id, c.name
  ORDER BY total_paid DESC;
$$;

REVOKE ALL ON FUNCTION get_expense_by_contact(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_expense_by_contact(UUID, DATE, DATE) TO service_role;
