-- 001_product_batches_expiry.sql
--
-- Per-batch inventory + expiry tracking (additive, idempotent).
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the new
-- batch/expiry schema and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- Detail ledger: one row per (product, branch, lot, expiry) while ACTIVE.
-- product_branch_inventory stays as the maintained aggregate cache.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_batches (
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    supplier_id uuid,
    po_id uuid,
    batch_number character varying(100),
    expiry_date date,
    received_date date DEFAULT current_date,
    cost_price numeric(12,2),
    quantity_received numeric(12,2) DEFAULT 0 NOT NULL,
    quantity_on_hand numeric(12,2) DEFAULT 0 NOT NULL,
    quantity_reserved numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_batches_pkey PRIMARY KEY (batch_id),
    CONSTRAINT product_batches_status_check
        CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'DEPLETED'::character varying, 'EXPIRED'::character varying, 'DISPOSED'::character varying])::text[]))),
    CONSTRAINT product_batches_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(product_id),
    CONSTRAINT product_batches_branch_id_fkey
        FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
    CONSTRAINT product_batches_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id),
    CONSTRAINT product_batches_po_id_fkey
        FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id)
);

-- Merge key for ACTIVE rows. Both nullable columns are wrapped in COALESCE
-- because Postgres treats NULL as distinct; without COALESCE two ACTIVE rows
-- with NULL batch_number/expiry could coexist. The ON CONFLICT target in
-- stock-in must use these exact expressions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_batches_active
    ON public.product_batches (
        product_id,
        branch_id,
        COALESCE(batch_number, ''::character varying),
        COALESCE(expiry_date, DATE '9999-12-31')
    )
    WHERE ((status)::text = 'ACTIVE'::text);

-- FEFO / detail reads.
CREATE INDEX IF NOT EXISTS ix_product_batches_fefo
    ON public.product_batches (branch_id, product_id, expiry_date, batch_id)
    WHERE (((status)::text = 'ACTIVE'::text) AND (quantity_on_hand > (0)::numeric));

-- Expiry report / alert scan.
CREATE INDEX IF NOT EXISTS ix_product_batches_expiry
    ON public.product_batches (expiry_date)
    WHERE ((status)::text = 'ACTIVE'::text);

-- ---------------------------------------------------------------------------
-- Sale line -> batch allocation detail. A single FEFO line can span batches,
-- so this is a child table rather than a single sale_items.batch_id column.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_item_batches (
    sale_item_id uuid NOT NULL,
    batch_id uuid NOT NULL,
    quantity numeric(12,2) NOT NULL,
    cost_price numeric(12,2),
    CONSTRAINT sale_item_batches_pkey PRIMARY KEY (sale_item_id, batch_id),
    CONSTRAINT sale_item_batches_batch_id_fkey
        FOREIGN KEY (batch_id) REFERENCES public.product_batches(batch_id)
);

-- ---------------------------------------------------------------------------
-- Backfill: give every expiry-tracked product with existing aggregate stock a
-- sentinel batch (unknown lot, never-expiring) so FEFO and the expiry report
-- see it. Skipped where an ACTIVE batch already exists for the pair.
-- ---------------------------------------------------------------------------
INSERT INTO public.product_batches (
    product_id, branch_id, batch_number, expiry_date,
    cost_price, quantity_received, quantity_on_hand, status
)
SELECT
    i.product_id,
    i.branch_id,
    NULL,
    DATE '9999-12-31',
    p.cost_price,
    i.quantity_on_hand,
    i.quantity_on_hand,
    'ACTIVE'
FROM public.product_branch_inventory i
JOIN public.products p ON p.product_id = i.product_id
WHERE p.expiry_required = TRUE
  AND i.quantity_on_hand > 0
  AND NOT EXISTS (
      SELECT 1 FROM public.product_batches b
      WHERE b.product_id = i.product_id
        AND b.branch_id = i.branch_id
        AND b.status = 'ACTIVE'
  );

-- ---------------------------------------------------------------------------
-- Allow the EXPIRY_ALERT notification type. Additive value; existing rows are
-- unaffected. Drop + recreate keeps the statement idempotent.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_notification_type_check
    CHECK (((notification_type)::text = ANY ((ARRAY[
        'LOW_STOCK'::character varying,
        'SYNC_FAILURE'::character varying,
        'BRANCH_SHORTAGE'::character varying,
        'TRANSFER_REQUEST'::character varying,
        'OTHER'::character varying,
        'INFO'::character varying,
        'WARNING'::character varying,
        'ERROR'::character varying,
        'SUCCESS'::character varying,
        'EXPIRY_ALERT'::character varying
    ])::text[])));

COMMIT;
