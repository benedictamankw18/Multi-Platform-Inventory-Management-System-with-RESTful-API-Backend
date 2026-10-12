-- 007_price_history_provenance.sql
--
-- Price History previously only recorded manual product price edits
-- (product.service.updateProduct) and could not tell which price field changed
-- or where the change came from. Purchase-order receipts now also feed the
-- history, so each row carries its provenance:
--   * price_type     - which price moved (COST / RETAIL / WHOLESALE)
--   * source         - MANUAL (product edit) or PURCHASE (PO receipt)
--   * reference_type / reference_id - the originating document (e.g. a PO)
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Additive and safe to re-run.

BEGIN;

ALTER TABLE public.price_history
    ADD COLUMN IF NOT EXISTS price_type character varying(20);

ALTER TABLE public.price_history
    ADD COLUMN IF NOT EXISTS source character varying(20);

ALTER TABLE public.price_history
    ADD COLUMN IF NOT EXISTS reference_type character varying(50);

ALTER TABLE public.price_history
    ADD COLUMN IF NOT EXISTS reference_id uuid;

ALTER TABLE public.price_history
    DROP CONSTRAINT IF EXISTS price_history_price_type_check;

ALTER TABLE public.price_history
    ADD CONSTRAINT price_history_price_type_check
    CHECK (price_type IS NULL OR (price_type)::text = ANY (ARRAY[
        'COST'::text, 'RETAIL'::text, 'WHOLESALE'::text
    ]));

ALTER TABLE public.price_history
    DROP CONSTRAINT IF EXISTS price_history_source_check;

ALTER TABLE public.price_history
    ADD CONSTRAINT price_history_source_check
    CHECK (source IS NULL OR (source)::text = ANY (ARRAY[
        'MANUAL'::text, 'PURCHASE'::text
    ]));

COMMIT;
