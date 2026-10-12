-- 006_inventory_transfer_shipped_state.sql
--
-- The inventory-transfer workflow in the application moves a transfer through
--   PENDING -> APPROVED -> SHIPPED -> RECEIVED
-- and records who shipped it. The base schema
-- (database/inventory_management_database_schema.sql) predates that workflow:
--   * inventory_transfers has no `shipped_by` column, and
--   * its status CHECK only allows DRAFT/PENDING/APPROVED/REJECTED/COMPLETED.
--
-- As a result creating a transfer failed on INSERT (unknown column) and
-- shipping/receiving could never satisfy the CHECK constraint. This migration
-- adds the missing column and widens the status constraint so the workflow
-- works. It is additive: existing rows/values remain valid.
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Safe to re-run.

BEGIN;

ALTER TABLE public.inventory_transfers
    ADD COLUMN IF NOT EXISTS shipped_by uuid;

ALTER TABLE public.inventory_transfers
    DROP CONSTRAINT IF EXISTS inventory_transfers_status_check;

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_status_check
    CHECK (((status)::text = ANY (ARRAY[
        'DRAFT'::character varying,
        'PENDING'::character varying,
        'APPROVED'::character varying,
        'REJECTED'::character varying,
        'SHIPPED'::character varying,
        'RECEIVED'::character varying,
        'COMPLETED'::character varying
    ]::text[])));

COMMIT;
