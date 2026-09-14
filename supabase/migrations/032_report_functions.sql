-- =============================================================
-- Migration 032: Report helper functions
-- =============================================================

-- ── 1. Outstanding dues per member ───────────────────────────
CREATE OR REPLACE FUNCTION get_outstanding_dues(p_masjid_id UUID)
RETURNS TABLE (
  member_id     UUID,
  member_number TEXT,
  full_name     TEXT,
  phone         TEXT,
  email         TEXT,
  balance       NUMERIC
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.id,
    m.member_number,
    m.full_name,
    m.phone,
    m.email,
    COALESCE(SUM(CASE WHEN l.type IN ('charge','opening_balance') THEN l.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.type IN ('payment','discount') THEN l.amount ELSE 0 END), 0) AS balance
  FROM members m
  LEFT JOIN ledger l ON l.member_id = m.id AND l.voided_at IS NULL
  WHERE m.masjid_id = p_masjid_id AND m.status IN ('active','inactive')
  GROUP BY m.id, m.member_number, m.full_name, m.phone, m.email
  HAVING
    COALESCE(SUM(CASE WHEN l.type IN ('charge','opening_balance') THEN l.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.type IN ('payment','discount') THEN l.amount ELSE 0 END), 0) > 0
  ORDER BY balance DESC;
$$;

REVOKE ALL ON FUNCTION get_outstanding_dues(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_outstanding_dues(UUID) TO service_role;

-- ── 2. Monthly P&L for a given calendar year ─────────────────
CREATE OR REPLACE FUNCTION get_monthly_pnl(p_masjid_id UUID, p_year INT)
RETURNS TABLE (
  month_num       INT,
  month_name      TEXT,
  member_payments NUMERIC,
  contact_revenue NUMERIC,
  donations       NUMERIC,
  total_revenue   NUMERIC,
  total_expense   NUMERIC,
  net             NUMERIC
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH months AS (SELECT generate_series(1,12) AS n),
  mp AS (
    SELECT EXTRACT(MONTH FROM COALESCE(l.transaction_date, l.created_at::date))::int AS m, SUM(l.amount) AS t
    FROM ledger l
    WHERE l.masjid_id = p_masjid_id AND l.type = 'payment' AND l.voided_at IS NULL
      AND EXTRACT(YEAR FROM COALESCE(l.transaction_date, l.created_at::date)) = p_year
    GROUP BY m
  ),
  cr AS (
    SELECT EXTRACT(MONTH FROM re.date)::int AS m, SUM(re.amount) AS t
    FROM revenue_expenses re
    WHERE re.masjid_id = p_masjid_id AND re.type = 'revenue'
      AND re.is_received = TRUE AND re.deleted_at IS NULL
      AND EXTRACT(YEAR FROM re.date) = p_year
    GROUP BY m
  ),
  dn AS (
    SELECT EXTRACT(MONTH FROM d.created_at)::int AS m, SUM(d.amount) AS t
    FROM donations d
    WHERE d.masjid_id = p_masjid_id AND d.voided_at IS NULL
      AND EXTRACT(YEAR FROM d.created_at) = p_year
    GROUP BY m
  ),
  ex AS (
    SELECT EXTRACT(MONTH FROM re.date)::int AS m, SUM(re.amount) AS t
    FROM revenue_expenses re
    WHERE re.masjid_id = p_masjid_id AND re.type = 'expense'
      AND re.is_paid = TRUE AND re.deleted_at IS NULL
      AND EXTRACT(YEAR FROM re.date) = p_year
    GROUP BY m
  )
  SELECT
    mo.n::int,
    TO_CHAR(TO_DATE(mo.n::text,'MM'),'Mon'),
    COALESCE(mp.t,0), COALESCE(cr.t,0), COALESCE(dn.t,0),
    COALESCE(mp.t,0)+COALESCE(cr.t,0)+COALESCE(dn.t,0),
    COALESCE(ex.t,0),
    COALESCE(mp.t,0)+COALESCE(cr.t,0)+COALESCE(dn.t,0)-COALESCE(ex.t,0)
  FROM months mo
  LEFT JOIN mp ON mp.m = mo.n
  LEFT JOIN cr ON cr.m = mo.n
  LEFT JOIN dn ON dn.m = mo.n
  LEFT JOIN ex ON ex.m = mo.n
  ORDER BY mo.n;
$$;

REVOKE ALL ON FUNCTION get_monthly_pnl(UUID,INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_monthly_pnl(UUID,INT) TO service_role;

-- ── 3. Revenue by program (charges billed + enrollment counts)
CREATE OR REPLACE FUNCTION get_program_revenue(p_masjid_id UUID)
RETURNS TABLE (
  program_id     UUID,
  program_name   TEXT,
  recurrence     TEXT,
  active         BOOLEAN,
  enrolled_count BIGINT,
  period_amount  NUMERIC,
  total_charged  NUMERIC
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.name,
    p.recurrence,
    p.active,
    COUNT(DISTINCT e.id)::BIGINT,
    COALESCE(SUM(e.amount),0),
    COALESCE(ch.total,0)
  FROM programs p
  LEFT JOIN enrollments e ON e.program_id = p.id
  LEFT JOIN (
    SELECT program_id, SUM(amount) AS total
    FROM ledger
    WHERE masjid_id = p_masjid_id AND type = 'charge'
      AND voided_at IS NULL AND program_id IS NOT NULL
    GROUP BY program_id
  ) ch ON ch.program_id = p.id
  WHERE p.masjid_id = p_masjid_id
  GROUP BY p.id, p.name, p.recurrence, p.active, ch.total
  ORDER BY p.name;
$$;

REVOKE ALL ON FUNCTION get_program_revenue(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_program_revenue(UUID) TO service_role;

-- ── 4. Service fee summary by fee code ───────────────────────
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
    AND (p_from IS NULL OR COALESCE(l.transaction_date,l.created_at::date) >= p_from)
    AND (p_to   IS NULL OR COALESCE(l.transaction_date,l.created_at::date) <= p_to)
  WHERE ri.masjid_id = p_masjid_id
  GROUP BY ri.id, ri.code, ri.name, ri.is_active
  ORDER BY total_charged DESC, ri.code;
$$;

REVOKE ALL ON FUNCTION get_service_fee_summary(UUID,DATE,DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_service_fee_summary(UUID,DATE,DATE) TO service_role;

-- ── 5. Collections by source ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_collections_summary(
  p_masjid_id UUID,
  p_from      DATE DEFAULT NULL,
  p_to        DATE DEFAULT NULL
)
RETURNS TABLE (source TEXT, txn_count BIGINT, total NUMERIC)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'Member Payments'::TEXT            AS source,
    COUNT(*)::BIGINT                        AS txn_count,
    COALESCE(SUM(l.amount),0)              AS total
  FROM ledger l
  WHERE l.masjid_id = p_masjid_id AND l.type = 'payment' AND l.voided_at IS NULL
    AND (p_from IS NULL OR COALESCE(l.transaction_date,l.created_at::date) >= p_from)
    AND (p_to   IS NULL OR COALESCE(l.transaction_date,l.created_at::date) <= p_to)

  UNION ALL

  SELECT 'Contact Revenue'::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(re.amount),0)
  FROM revenue_expenses re
  WHERE re.masjid_id = p_masjid_id AND re.type = 'revenue'
    AND re.is_received = TRUE AND re.deleted_at IS NULL
    AND (p_from IS NULL OR re.date >= p_from)
    AND (p_to   IS NULL OR re.date <= p_to)

  UNION ALL

  SELECT 'Donations'::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(d.amount),0)
  FROM donations d
  WHERE d.masjid_id = p_masjid_id AND d.voided_at IS NULL
    AND (p_from IS NULL OR d.created_at::date >= p_from)
    AND (p_to   IS NULL OR d.created_at::date <= p_to)

  ORDER BY 3 DESC;
$$;

REVOKE ALL ON FUNCTION get_collections_summary(UUID,DATE,DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_collections_summary(UUID,DATE,DATE) TO service_role;

-- ── 6. Expense breakdown by contact ──────────────────────────
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
    COALESCE(SUM(re.amount),0)  AS total_paid,
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

REVOKE ALL ON FUNCTION get_expense_by_contact(UUID,DATE,DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_expense_by_contact(UUID,DATE,DATE) TO service_role;
