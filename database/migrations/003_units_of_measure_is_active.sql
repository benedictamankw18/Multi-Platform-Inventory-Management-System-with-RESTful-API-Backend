-- 003_units_of_measure_is_active.sql
--
-- Adds an `is_active` flag to units_of_measure so a UoM can be disabled
-- (hidden from pickers) without being deleted, mirroring categories.
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Safe to re-run.

BEGIN;

ALTER TABLE public.units_of_measure
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

COMMIT;
