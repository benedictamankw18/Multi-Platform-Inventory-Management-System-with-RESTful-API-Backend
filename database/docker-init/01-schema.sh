#!/bin/sh
# Loads the application schema into $POSTGRES_DB on first database init.
#
# The source file is a full pg_dump (PostgreSQL 18) that assumes a standalone
# psql superuser session against a database that does not exist yet. Inside the
# postgres entrypoint the target database is already created (POSTGRES_DB), so
# the following lines must be removed:
#   - \restrict / \unrestrict  (psql 18 dump guards)
#   - DROP DATABASE / CREATE DATABASE / ALTER DATABASE
#   - \connect
#   - CREATE SCHEMA public;    (created by initdb)
# This script runs only when the data volume is empty.
#
# NOTE: POSTGRES_USER must be `postgres` because the dump assigns objects to it.

SCHEMA_FILE="${SCHEMA_FILE:-/schema/inventory_management_database_schema.sql}"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "[init] schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

echo "[init] loading schema into database '$POSTGRES_DB' from $SCHEMA_FILE"

sed \
  -e '/^\\restrict/d' \
  -e '/^\\unrestrict/d' \
  -e '/^\\connect/d' \
  -e '/^DROP DATABASE/d' \
  -e '/^CREATE DATABASE/d' \
  -e '/^ALTER DATABASE/d' \
  -e '/^CREATE SCHEMA public;/d' \
  "$SCHEMA_FILE" \
| psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" || exit 1

echo "[init] schema load complete"
