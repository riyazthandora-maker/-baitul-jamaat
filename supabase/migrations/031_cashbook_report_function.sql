-- =============================================================
-- Migration 031: Cash Book report function
-- Returns every actual cash movement for a masjid (oldest first)
-- with a running balance computed via window function.
--
-- Sources included:
--   ledger (type = 'payment')          → member payments received
--   revenue_expenses (revenue, received) → external revenue
--   donations                           → one-time donations
--   revenue_expenses (expense, paid)    → expenses disbursed
--
-- Charges / discounts / opening_balance ledger entries are
-- intentionally excluded — they are not cash movements.
-- =============================================================

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

    -- ── 1. Member payments (actual cash received from members) ────────
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

    -- ── 2. External revenue received from contacts ────────────────────
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

    -- ── 3. One-time donations from non-members ────────────────────────
    SELECT
      d.id::TEXT                                                  AS id,
      d.created_at::DATE                                          AS txn_date,
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

    -- ── 4. Expenses disbursed to contacts ─────────────────────────────
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
