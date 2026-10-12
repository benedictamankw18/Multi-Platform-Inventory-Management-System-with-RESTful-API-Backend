-- 008_cashier_page_access.sql
--
-- Cashier could reach back-office pages because page visibility and data access
-- share the same permission. Some of those data permissions must stay on the
-- role, though:
--   * POS still needs VIEW_PRODUCTS (product search) + VIEW_CUSTOMERS (lookup),
--   * the Dashboard (which Cashier keeps) reads /reports/* and /audit, so it
--     still needs VIEW_REPORTS + VIEW_AUDIT_LOGS.
--
-- This migration separates *page* access from *data* access by adding dedicated
-- page permissions:
--   * VIEW_PRODUCTS_PAGE   - Products + Price History pages
--   * VIEW_CUSTOMERS_PAGE  - Customers page
--   * VIEW_SYNC_PAGE       - Sync & Offline page
--   * VIEW_REPORTS_PAGE    - Reports + Expiry Report pages
--   * VIEW_AUDIT_LOGS_PAGE - Audit Logs + Sync Logs pages
--
-- Page permissions are enforced by the clients (sidebar filter + route guards);
-- backend data endpoints keep their existing permissions, so POS and the
-- Dashboard are unaffected. Cashier loses the page permissions plus the
-- Categories/Suppliers data permissions (only used by pages it no longer sees).
--
-- The pg_dump in database/inventory_management_database_schema.sql remains the
-- immutable base schema. This migration is the source of truth for the change
-- and is applied:
--   * on a fresh Docker volume by database/docker-init/04-migrations.sh, and
--   * on an existing database by database/apply-migrations.sh.
--
-- Additive and safe to re-run.

BEGIN;

-- ===== Page-access permissions =====
INSERT INTO public.permissions (permission_name, description) VALUES
  ('VIEW_PRODUCTS_PAGE',   'Access the products and price history pages'),
  ('VIEW_CUSTOMERS_PAGE',  'Access the customers page'),
  ('VIEW_SYNC_PAGE',       'Access the sync and offline page'),
  ('VIEW_REPORTS_PAGE',    'Access the reports and expiry report pages'),
  ('VIEW_AUDIT_LOGS_PAGE', 'Access the audit logs and sync logs pages')
ON CONFLICT (permission_name) DO NOTHING;

-- ===== Grant page permissions to every role except Cashier =====
-- Sync & Offline was previously visible to any authenticated user, so mirror
-- that for every other role.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.deleted_at IS NULL
  AND r.role_name <> 'Cashier'
  AND p.permission_name = 'VIEW_SYNC_PAGE'
ON CONFLICT DO NOTHING;

-- The remaining page permissions mirror the matching data permission, which is
-- kept for the endpoints other visible pages (POS, Dashboard) rely on.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
JOIN public.role_permissions rp ON rp.role_id = r.role_id
JOIN public.permissions dp ON dp.permission_id = rp.permission_id
CROSS JOIN public.permissions p
WHERE r.deleted_at IS NULL
  AND r.role_name <> 'Cashier'
  AND (dp.permission_name, p.permission_name) IN (
    ('VIEW_PRODUCTS',   'VIEW_PRODUCTS_PAGE'),
    ('VIEW_CUSTOMERS',  'VIEW_CUSTOMERS_PAGE'),
    ('VIEW_REPORTS',    'VIEW_REPORTS_PAGE'),
    ('VIEW_AUDIT_LOGS', 'VIEW_AUDIT_LOGS_PAGE')
  )
ON CONFLICT DO NOTHING;

-- ===== Cashier =====
-- The Dashboard reads report + audit endpoints, so those *data* permissions must
-- stay granted; only the pages are hidden. Re-assert them (idempotent) in case
-- an earlier revision of this migration removed them.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.deleted_at IS NULL
  AND r.role_name = 'Cashier'
  AND p.permission_name IN ('VIEW_REPORTS', 'VIEW_AUDIT_LOGS')
ON CONFLICT DO NOTHING;

-- Cashier must never hold a page-access permission.
DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.role_id
  AND rp.permission_id = p.permission_id
  AND r.deleted_at IS NULL
  AND r.role_name = 'Cashier'
  AND p.permission_name IN (
    'VIEW_PRODUCTS_PAGE', 'VIEW_CUSTOMERS_PAGE', 'VIEW_SYNC_PAGE',
    'VIEW_REPORTS_PAGE', 'VIEW_AUDIT_LOGS_PAGE'
  );

-- Revoke the back-office data permissions only used by pages Cashier no longer
-- sees (Categories / Units of Measure and Suppliers). The product/customer and
-- report/audit data permissions are intentionally kept.
DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.role_id
  AND rp.permission_id = p.permission_id
  AND r.deleted_at IS NULL
  AND r.role_name = 'Cashier'
  AND p.permission_name IN ('VIEW_CATEGORIES', 'VIEW_SUPPLIERS');

COMMIT;
