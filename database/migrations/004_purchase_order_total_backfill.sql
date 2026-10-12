-- 004_purchase_order_total_backfill.sql
--
-- purchase_orders.total_amount became a derived value:
--   SUM(purchase_order_items.line_total)
--     + shipping_cost + tax_amount - discount_amount
--
-- New and updated orders are recalculated by the application. This migration
-- backfills any pre-existing rows so their stored total matches the value shown
-- in the UI (and compared against by recordPayment).
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Safe to re-run (only rows whose total is out of date are touched).

BEGIN;

UPDATE public.purchase_orders po
SET total_amount =
        COALESCE((SELECT SUM(poi.line_total) FROM public.purchase_order_items poi WHERE poi.po_id = po.po_id), 0)
      + COALESCE(po.shipping_cost, 0)
      + COALESCE(po.tax_amount, 0)
      - COALESCE(po.discount_amount, 0)
WHERE po.total_amount IS DISTINCT FROM (
        COALESCE((SELECT SUM(poi.line_total) FROM public.purchase_order_items poi WHERE poi.po_id = po.po_id), 0)
      + COALESCE(po.shipping_cost, 0)
      + COALESCE(po.tax_amount, 0)
      - COALESCE(po.discount_amount, 0)
      );

COMMIT;
