-- 005_universal_batch_ledger.sql
--
-- The batch ledger is the lot-level source of truth for EVERY product that
-- holds stock, not only those with products.expiry_required = TRUE. Expiry is
-- now optional metadata: expiry_required still forces a lot date on receipt and
-- drives the expiry report, but a product with no expiry date still gets a
-- (no-expiry) batch so it appears on the Batches page and FEFO still works.
--
-- This migration backfills an ACTIVE no-expiry batch for any product/branch
-- whose aggregate stock is not yet covered by the ledger. Expiry-tracked
-- products are already covered by 001, so in practice this seeds the non-expiry
-- products (which had no batch rows at all before).
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Safe to re-run: only the uncovered difference (aggregate minus ledger) is
-- inserted, and it merges into an existing no-expiry lot when one is present.

BEGIN;

INSERT INTO public.product_batches (
    product_id, branch_id, batch_number, expiry_date,
    cost_price, quantity_received, quantity_on_hand, status
)
SELECT
    i.product_id,
    i.branch_id,
    NULL,
    NULL,
    p.cost_price,
    i.quantity_on_hand - COALESCE(ledger.covered, 0),
    i.quantity_on_hand - COALESCE(ledger.covered, 0),
    'ACTIVE'
FROM public.product_branch_inventory i
JOIN public.products p ON p.product_id = i.product_id
LEFT JOIN (
    SELECT product_id, branch_id, SUM(quantity_on_hand) AS covered
    FROM public.product_batches
    WHERE status IN ('ACTIVE', 'EXPIRED')
    GROUP BY product_id, branch_id
) ledger ON ledger.product_id = i.product_id AND ledger.branch_id = i.branch_id
WHERE i.quantity_on_hand > COALESCE(ledger.covered, 0)
ON CONFLICT (
    product_id,
    branch_id,
    COALESCE(batch_number, ''),
    COALESCE(expiry_date, DATE '9999-12-31')
) WHERE status = 'ACTIVE'
DO UPDATE SET
    quantity_on_hand = public.product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand,
    quantity_received = public.product_batches.quantity_received + EXCLUDED.quantity_received,
    updated_at = now();

COMMIT;
