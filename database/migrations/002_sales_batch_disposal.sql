-- 002_sales_batch_disposal.sql
-- Phase 3: batch disposal records an inventory_transactions row of type
-- 'DISPOSAL'. The base schema's CHECK only allows STOCK_IN/STOCK_OUT/
-- ADJUSTMENT/TRANSFER_IN/TRANSFER_OUT/SALE, so the constraint is dropped and
-- re-added with the new value. Idempotent: IF NOT EXISTS on the constraint the
-- second time around is not possible for CHECK (no ADD CONSTRAINT IF NOT
-- EXISTS), so the drop is guarded and re-adding is declared as a plain ADD.

BEGIN;

ALTER TABLE public.inventory_transactions
    DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_transaction_type_check
    CHECK (((transaction_type)::text = ANY (ARRAY[
        'STOCK_IN'::character varying,
        'STOCK_OUT'::character varying,
        'ADJUSTMENT'::character varying,
        'TRANSFER_IN'::character varying,
        'TRANSFER_OUT'::character varying,
        'SALE'::character varying,
        'DISPOSAL'::character varying
    ]::text[])));

COMMIT;