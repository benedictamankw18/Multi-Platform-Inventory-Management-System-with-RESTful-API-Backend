-- seed-permissions.sql
-- Run once to populate the permissions table and assign default role permissions.
-- Idempotent: uses ON CONFLICT DO NOTHING so re-runs are safe.

-- ====== Insert all permissions ======
INSERT INTO permissions (permission_name, description) VALUES
  ('VIEW_DASHBOARD',     'Access the dashboard page'),
  ('VIEW_PRODUCTS',      'View products list'),
  ('CREATE_PRODUCT',     'Create and edit products'),
  ('DELETE_PRODUCT',     'Delete products'),
  ('IMPORT_PRODUCTS',    'Import products from file'),
  ('EXPORT_PRODUCTS',    'Export products to file'),
  ('VIEW_CATEGORIES',    'View categories'),
  ('MANAGE_CATEGORIES',  'Create, edit, and delete categories'),
  ('VIEW_INVENTORY',     'View inventory levels'),
  ('MANAGE_INVENTORY',   'Create inventory entries and adjustments'),
  ('TRANSFER_INVENTORY', 'Create inventory transfers between branches'),
  ('VIEW_SALES',         'View sales list'),
  ('CREATE_SALE',        'Create sales via POS and manual entry'),
  ('VOID_SALE',          'Void and refund sales'),
  ('VIEW_PURCHASES',     'View purchase orders'),
  ('MANAGE_PURCHASES',   'Create and edit purchase orders'),
  ('VIEW_SUPPLIERS',     'View suppliers list'),
  ('MANAGE_SUPPLIERS',   'Create, edit, and delete suppliers'),
  ('VIEW_CUSTOMERS',     'View customers list'),
  ('MANAGE_CUSTOMERS',   'Create, edit, and delete customers'),
  ('VIEW_EXPENSES',      'View expenses'),
  ('MANAGE_EXPENSES',    'Create, edit, and delete expenses'),
  ('VIEW_REPORTS',       'Access reports and analytics'),
  ('MANAGE_USERS',       'Manage users, roles, and permissions'),
  ('VIEW_BRANCHES',      'View branches list'),
  ('MANAGE_BRANCHES',    'Create, edit, and delete branches'),
  ('VIEW_AUDIT_LOGS',    'View audit logs'),
  ('MANAGE_SETTINGS',    'Access and modify business settings'),
  ('MANAGE_NOTIFICATIONS', 'Create and send notifications'),
  ('MANAGE_SYNC',          'View sync operations and receive sync failure alerts')
ON CONFLICT (permission_name) DO NOTHING;

-- ====== Role permission assignments ======
-- All use ON CONFLICT DO NOTHING so re-runs are safe.

-- Administrator: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Administrator'
  AND r.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Business Owner: all except MANAGE_ROLES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Business Owner'
  AND r.deleted_at IS NULL
  AND p.permission_name != 'MANAGE_ROLES'
ON CONFLICT DO NOTHING;

-- Manager: full operations except admin/user/branch management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Manager'
  AND r.deleted_at IS NULL
  AND p.permission_name IN (
    'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'CREATE_PRODUCT', 'DELETE_PRODUCT', 'IMPORT_PRODUCTS', 'EXPORT_PRODUCTS',
    'VIEW_CATEGORIES', 'MANAGE_CATEGORIES',
    'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'TRANSFER_INVENTORY',
    'VIEW_SALES', 'CREATE_SALE', 'VOID_SALE',
    'VIEW_PURCHASES', 'MANAGE_PURCHASES',
    'VIEW_SUPPLIERS', 'MANAGE_SUPPLIERS',
    'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS',
    'VIEW_EXPENSES', 'MANAGE_EXPENSES',
    'VIEW_BRANCHES',
    'VIEW_REPORTS', 'VIEW_AUDIT_LOGS', 'MANAGE_SYNC'
  )
ON CONFLICT DO NOTHING;

-- Branch Manager: operations minus user/branch write/settings/delete management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Branch Manager'
  AND r.deleted_at IS NULL
  AND p.permission_name IN (
    'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'CREATE_PRODUCT', 'IMPORT_PRODUCTS', 'EXPORT_PRODUCTS',
    'VIEW_CATEGORIES', 'MANAGE_CATEGORIES',
    'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'TRANSFER_INVENTORY',
    'VIEW_SALES', 'CREATE_SALE', 'VOID_SALE',
    'VIEW_PURCHASES', 'MANAGE_PURCHASES',
    'VIEW_SUPPLIERS', 'MANAGE_SUPPLIERS',
    'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS',
    'VIEW_EXPENSES', 'MANAGE_EXPENSES',
    'VIEW_BRANCHES',
    'VIEW_REPORTS', 'VIEW_AUDIT_LOGS'
  )
ON CONFLICT DO NOTHING;

-- Storekeeper: stock management focused
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Storekeeper'
  AND r.deleted_at IS NULL
  AND p.permission_name IN (
    'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'CREATE_PRODUCT',
    'VIEW_CATEGORIES', 'MANAGE_CATEGORIES',
    'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'TRANSFER_INVENTORY',
    'VIEW_SALES', 'VIEW_CUSTOMERS',
    'VIEW_SUPPLIERS',
    'VIEW_BRANCHES',
    'VIEW_REPORTS', 'VIEW_AUDIT_LOGS'
  )
ON CONFLICT DO NOTHING;

-- Cashier: point-of-sale and basic viewing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Cashier'
  AND r.deleted_at IS NULL
  AND p.permission_name IN (
    'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'CREATE_SALE', 'VIEW_SALES', 'VIEW_CUSTOMERS',
    'VIEW_REPORTS', 'VIEW_AUDIT_LOGS', 'VIEW_CATEGORIES', 'VIEW_SUPPLIERS',
    'VIEW_BRANCHES'
  )
ON CONFLICT DO NOTHING;

-- Technical: monitoring and read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'Technical'
  AND r.deleted_at IS NULL
  AND p.permission_name IN (
    'VIEW_DASHBOARD', 'VIEW_PRODUCTS',
    'VIEW_INVENTORY', 'VIEW_SALES', 'VIEW_CATEGORIES',
    'VIEW_SUPPLIERS',
    'VIEW_BRANCHES',
    'VIEW_REPORTS', 'VIEW_AUDIT_LOGS'
  )
ON CONFLICT DO NOTHING;
