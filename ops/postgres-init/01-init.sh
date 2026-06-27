#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Runs ONCE, on the Postgres container's first boot (empty data dir), via the
# official image's /docker-entrypoint-initdb.d hook.
#
# The main `smartworkers` DB + `${POSTGRES_USER}` role are already created by the
# image from POSTGRES_DB / POSTGRES_USER. This script adds the SECOND logical DB
# used by sms-gateway and a least-privilege role scoped to it.
#
# Env consumed (set on the postgres service in docker-compose.yml):
#   POSTGRES_USER       — superuser to connect as (default: smartworkers)
#   SMSGW_DB_PASSWORD   — password for the new smsgw role
# ─────────────────────────────────────────────────────────────────────────────
set -e

if [ -z "${SMSGW_DB_PASSWORD}" ]; then
  echo "ERROR: SMSGW_DB_PASSWORD is not set; cannot create sms_gateway role." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "postgres" <<-EOSQL
    CREATE ROLE smsgw LOGIN PASSWORD '${SMSGW_DB_PASSWORD}';
    CREATE DATABASE sms_gateway OWNER smsgw;
    GRANT ALL PRIVILEGES ON DATABASE sms_gateway TO smsgw;
EOSQL

# Lock down the public schema on the new DB so only smsgw can use it.
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "sms_gateway" <<-EOSQL
    GRANT ALL ON SCHEMA public TO smsgw;
EOSQL

echo "postgres-init: created database sms_gateway + role smsgw"
