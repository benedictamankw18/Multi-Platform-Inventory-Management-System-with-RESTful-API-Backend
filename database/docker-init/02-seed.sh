#!/bin/sh
# 02-seed.sh — seeds the core rows required to log in. First database init only.
#
# The schema dump is DDL-only, so a fresh database has no roles, branch, or
# users. This script creates them idempotently (safe to re-run):
#   - the system roles referenced by seed-permissions.sql
#   - a default branch
#   - a minimal business_settings row
#   - an initial administrator (bcrypt hash generated with pgcrypto)
#
# The admin password is read from the environment so no secret is committed to
# the repository. If it is not set, no administrator is created.
#
#   SEED_ADMIN_USERNAME  (default: admin)
#   SEED_ADMIN_PASSWORD  (no default; leave unset to skip the admin user)
#   SEED_ADMIN_EMAIL     (default: admin@example.com)
#   SEED_BRANCH_NAME     (default: Main Branch)

ADMIN_USERNAME="${SEED_ADMIN_USERNAME:-admin}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@example.com}"
BRANCH_NAME="${SEED_BRANCH_NAME:-Main Branch}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "[seed] WARNING: SEED_ADMIN_PASSWORD is not set - no administrator will be created." >&2
fi

echo "[seed] seeding roles, branch, business settings, and admin user"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v admin_username="$ADMIN_USERNAME" \
  -v admin_email="$ADMIN_EMAIL" \
  -v branch_name="$BRANCH_NAME" \
  -v admin_password="$ADMIN_PASSWORD" \
  <<'SQL' || exit 1
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- System roles. `roles` has no unique constraint on role_name, so guard with
-- NOT EXISTS rather than ON CONFLICT.
INSERT INTO roles (role_name, description, is_system)
SELECT v.role_name, v.description, TRUE
FROM (VALUES
  ('Administrator',  'Full system access'),
  ('Business Owner', 'Business owner'),
  ('Manager',        'Operations manager'),
  ('Branch Manager', 'Branch supervisor'),
  ('Storekeeper',    'Inventory custodian'),
  ('Cashier',        'Point of sale operator'),
  ('Technical',      'Monitoring and read-only access')
) AS v(role_name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.role_name = v.role_name);

-- Default branch (also no unique constraint on branch_name).
INSERT INTO branches (branch_name)
SELECT :'branch_name'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE branch_name = :'branch_name');

-- Minimal business settings (some endpoints expect exactly one row).
INSERT INTO business_settings (business_name)
SELECT 'My Business'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- Initial administrator. pgcrypto's crypt(..., gen_salt('bf')) produces a
-- standard bcrypt hash ($2a$) which the API's bcrypt.compare() verifies.
INSERT INTO users (branch_id, role_id, full_name, username, email, password_hash)
SELECT b.branch_id,
       r.role_id,
       'System Administrator',
       :'admin_username',
       :'admin_email',
       crypt(:'admin_password', gen_salt('bf', 10))
FROM roles r
CROSS JOIN branches b
WHERE r.role_name = 'Administrator'
  AND b.branch_name = :'branch_name'
  AND length(:'admin_password') > 0
ON CONFLICT (username) DO NOTHING;

-- Grant the initial administrator access to the default branch. Branch access
-- is driven by the user_branches join table (not users.branch_id); without a
-- row here the web client's branch-selection screen reports "No branch
-- assigned".
INSERT INTO user_branches (user_id, branch_id)
SELECT u.user_id, b.branch_id
FROM users u
JOIN roles r ON r.role_id = u.role_id
JOIN branches b ON b.branch_name = :'branch_name'
WHERE u.username = :'admin_username'
  AND r.role_name = 'Administrator'
ON CONFLICT (user_id, branch_id) DO NOTHING;
SQL

echo "[seed] core seed complete"
