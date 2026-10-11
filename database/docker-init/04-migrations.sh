#!/bin/sh
# 04-migrations.sh - applies database/migrations/*.sql after the base schema
# and seed scripts have run. Runs only on first database init (files in
# /docker-entrypoint-initdb.d are processed in lexicographic order).
#
# For an already-initialised database, use database/apply-migrations.sh instead.
#
# Migrations are additive and idempotent; see database/migrations/.

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "[migrate] migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "[migrate] applying migrations from $MIGRATIONS_DIR"

for f in "$MIGRATIONS_DIR"/*.sql; do
  # Guard the no-match case: the glob stays literal when nothing matches.
  [ -e "$f" ] || continue
  echo "[migrate] applying $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f" || exit 1
done

echo "[migrate] migrations complete"
