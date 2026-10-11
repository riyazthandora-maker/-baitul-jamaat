-- Update report functions to use receipt_date instead of created_at for donations.
-- Affects: get_cashbook, get_monthly_pnl, get_collections_summary.

-- ── get_cashbook ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_cashbook(p_masjid_id UUID)
RETURNS TABLE (
  id              TEXT,
  txn_date        DATE,
  sort_ts         TIMESTAMPTZ,
  entity_name     TEXT,
  category        TEXT,
  sub_category    TEXT,
  cash_in         NUMERIC,
  cash_out        NUMERIC,
  reference       TEXT,
  running_balance NUMERIC
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH entries AS (

    -- ── 1. Member payments ────────────────────────────────────────────────────
    SELECT
      l.id::TEXT                                                  AS id,
      COALESCE(l.transaction_date, l.created_at::DATE)           AS txn_date,
      l.created_at                                                AS sort_ts,
      m.full_name                                                 AS entity_name,
      CASE
        WHEN l.program_id      IS NOT NULL THEN 'Member Program'
        WHEN l.revenue_item_id IS NOT NULL THEN 'Service Fee'
        ELSE                                    'Member Payment'
      END                                                         AS category,
      COALESCE(p.name, ri.name, '')                               AS sub_category,
      l.amount                                                    AS cash_in,
      0::NUMERIC                                                  AS cash_out,
      COALESCE(r.receipt_number, '')                              AS reference
    FROM   ledger          l
    JOIN   members         m  ON m.id  = l.member_id
    LEFT JOIN programs     p  ON p.id  = l.program_id
    LEFT JOIN revenue_items ri ON ri.id = l.revenue_item_id
    LEFT JOIN receipts     r  ON r.id  = l.receipt_id
    WHERE  l.masjid_id = p_masjid_id
      AND  l.type      = 'payment'
      AND  l.voided_at IS NULL

    UNION ALL

    -- ── 2. External revenue from contacts ─────────────────────────────────────
    SELECT
      re.id::TEXT                                                 AS id,
      re.date                                                     AS txn_date,
      re.created_at                                               AS sort_ts,
      COALESCE(c.name, mem.full_name, 'Unknown')                  AS entity_name,
      'Contact Revenue'                                           AS category,
      COALESCE(re.remarks, '')                                    AS sub_category,
      re.amount                                                   AS cash_in,
      0::NUMERIC                                                  AS cash_out,
      COALESCE(re.receipt_number, '')                             AS reference
    FROM   revenue_expenses re
    LEFT JOIN contacts c   ON c.id  = re.entity_id AND re.entity_type = 'contact'
    LEFT JOIN members  mem ON mem.id = re.entity_id AND re.entity_type = 'member'
    WHERE  re.masjid_id   = p_masjid_id
      AND  re.type        = 'revenue'
      AND  re.is_received = TRUE
      AND  re.deleted_at  IS NULL

    UNION ALL

    -- ── 3. One-time donations — use receipt_date for the transaction date ──────
    SELECT
      d.id::TEXT                                                  AS id,
      d.receipt_date                                              AS txn_date,
      d.created_at                                                AS sort_ts,
      d.donor_name                                                AS entity_name,
      'Donation'                                                  AS category,
      COALESCE(d.purpose, '')                                     AS sub_category,
      d.amount                                                    AS cash_in,
      0::NUMERIC                                                  AS cash_out,
      COALESCE(d.receipt_number, '')                              AS reference
    FROM   donations d
    WHERE  d.masjid_id = p_masjid_id
      AND  d.voided_at IS NULL

    UNION ALL

    -- ── 4. Expenses disbursed ─────────────────────────────────────────────────
    SELECT
      re.id::TEXT                                                 AS id,
      re.date                                                     AS txn_date,
      re.created_at                                               AS sort_ts,
      COALESCE(c.name, mem.full_name, 'Unknown')                  AS entity_name,
      'Expense'                                                   AS category,
      COALESCE(re.remarks, '')                                    AS sub_category,
      0::NUMERIC                                                  AS cash_in,
      re.amount                                                   AS cash_out,
      COALESCE(re.voucher_number, '')                             AS reference
    FROM   revenue_expenses re
    LEFT JOIN contacts c   ON c.id  = re.entity_id AND re.entity_type = 'contact'
    LEFT JOIN members  mem ON mem.id = re.entity_id AND re.entity_type = 'member'
    WHERE  re.masjid_id = p_masjid_id
      AND  re.type      = 'expense'
      AND  re.is_paid   = TRUE
      AND  re.deleted_at IS NULL
  )
  SELECT
    id,
    txn_date,
    sort_ts,
    entity_name,
    category,
    sub_category,
    cash_in,
    cash_out,
    reference,
    SUM(cash_in - cash_out) OVER (
      ORDER BY txn_date ASC, sort_ts ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
  FROM entries
  ORDER BY txn_date ASC, sort_ts ASC;
$$;

REVOKE ALL ON FUNCTION get_cashbook(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_cashbook(UUID) TO service_role;

-- ── get_monthly_pnl ───────────────────────────────────────────────────────────
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
    SELECT EXTRACT(MONTH FROM d.receipt_date)::int AS m, SUM(d.amount) AS t
    FROM donations d
    WHERE d.masjid_id = p_masjid_id AND d.voided_at IS NULL
      AND EXTRACT(YEAR FROM d.receipt_date) = p_year
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

-- ── get_collections_summary ───────────────────────────────────────────────────
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
    AND (p_from IS NULL OR d.receipt_date >= p_from)
    AND (p_to   IS NULL OR d.receipt_date <= p_to)

  ORDER BY 3 DESC;
$$;

REVOKE ALL ON FUNCTION get_collections_summary(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_collections_summary(UUID, DATE, DATE) TO service_role;
