#!/usr/bin/env bash
# Esegue migration + test su un database Postgres locale usa-e-getta.
# Uso: PGURL=postgres://user@host/postgres npm run db:test
set -euo pipefail
cd "$(dirname "$0")/.."
PGURL="${PGURL:-postgres://postgres@localhost:5432/postgres}"
DB="personal_test_$$"
psql "$PGURL" -qc "create database $DB" >/dev/null
trap 'psql "$PGURL" -qc "drop database if exists $DB" >/dev/null' EXIT
URL="${PGURL%/*}/$DB"
psql "$URL" -q -v ON_ERROR_STOP=1 -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
for f in tests/*_test.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
echo "OK: tutti i test del database sono passati"
