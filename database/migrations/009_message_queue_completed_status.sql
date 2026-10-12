-- 009_message_queue_completed_status.sql
--
-- The Message Queue admin page already labels a finished job "COMPLETED" (its
-- status filter and badge colour map use that value), but the worker wrote the
-- status as 'DONE'. As a result finished jobs rendered as "DONE" and selecting
-- the "COMPLETED" filter matched nothing.
--
-- This migration aligns the stored value with the UI. Existing 'DONE' rows are
-- converted to 'COMPLETED', and queue.repository.markDone now writes
-- 'COMPLETED'. message_queue.status has no CHECK constraint, so no schema change
-- is required.
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Idempotent and safe to re-run (a no-op once no 'DONE' rows remain).

BEGIN;

UPDATE public.message_queue
   SET status = 'COMPLETED',
       updated_at = now()
 WHERE status = 'DONE';

COMMIT;
