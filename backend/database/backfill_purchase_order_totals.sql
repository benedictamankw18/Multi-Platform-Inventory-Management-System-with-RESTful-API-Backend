-- Backfill purchase_orders.total_amount from the sum of its item line totals.
-- Idempotent: only touches POs that HAVE items; POs without items keep their current value.

UPDATE purchase_orders po
SET total_amount = sub.total
FROM (
  SELECT po_id, SUM(line_total) AS total
  FROM purchase_order_items
  GROUP BY po_id
) sub
WHERE po.po_id = sub.po_id
  AND po.total_amount IS DISTINCT FROM sub.total;
