#!/bin/sh
# apply-migrations.sh - apply database/migrations/*.sql to an existing database.
#
# The docker-init scripts run only when the data volume is empty, so a database
# that already exists needs this script to pick up new migrations.
#
# Connection settings come from the standard libpq environment variables,
# defaulting to the docker-compose values:
#   PGHOST / DB_HOST        (default: localhost)
#   PGPORT / DB_PORT        (default: 5432)
#   PGDATABASE / DB_NAME    (default: multiplatforminventorysystem)
#   PGUSER / DB_USER        (default: postgres)
#   PGPASSWORD / DB_PASSWORD
#
# Examples:
#   Host:
#     DB_HOST=localhost DB_NAME=multiplatforminventorysystem DB_USER=postgres \
#       DB_PASSWORD=secret sh database/apply-migrations.sh
#
#   Against the compose Postgres:
#     docker compose cp database/migrations postgres:/migrations
#     docker compose exec -T postgres sh -c \
#       'for f in /migrations/*.sql; do psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f" || exit 1; done'

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$SCRIPT_DIR/migrations}"

export PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
export PGPORT="${PGPORT:-${DB_PORT:-5432}}"
export PGDATABASE="${PGDATABASE:-${DB_NAME:-multiplatforminventorysystem}}"
export PGUSER="${PGUSER:-${DB_USER:-postgres}}"
if [ -z "${PGPASSWORD:-}" ] && [ -n "${DB_PASSWORD:-}" ]; then
  export PGPASSWORD="$DB_PASSWORD"
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "[migrate] migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "[migrate] applying migrations from $MIGRATIONS_DIR to $PGDATABASE@$PGHOST:$PGPORT"

for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -e "$f" ] || continue
  echo "[migrate] applying $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -f "$f"
done

echo "[migrate] migrations complete"
