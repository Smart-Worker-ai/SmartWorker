#!/usr/bin/env bash
# Copy customer + admin to the Hyraku VPS, then optionally rebuild Docker.
#
#   ./deploy-vps.sh           # rsync only
#   ./deploy-vps.sh --build   # rsync, then docker compose up --build
#   ./deploy-vps.sh logs      # API container logs (no copy)
#
# Password: put the VPS SSH password as the only line in .vps-password
# (this folder). That file is gitignored and never copied to the server.
# Override path with HYRAKU_VPS_PASSWORD_FILE.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${HYRAKU_VPS_HOST:-root@15.235.145.222}"
PORT="${HYRAKU_VPS_PORT:-20115}"
REMOTE="${HYRAKU_VPS_DIR:-/opt/hyraku}"
PASS_FILE="${HYRAKU_VPS_PASSWORD_FILE:-$ROOT/.vps-password}"

SSH_OPTS=(-p "$PORT" -o IdentitiesOnly=yes -o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=1)
SSH=(ssh "${SSH_OPTS[@]}")
RSH="ssh ${SSH_OPTS[*]}"

if [[ -f "$PASS_FILE" ]]; then
  chmod 600 "$PASS_FILE" || true
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "Install sshpass (sudo apt install sshpass) to use ${PASS_FILE}" >&2
    exit 1
  fi
  SSH=(sshpass -f "$PASS_FILE" ssh "${SSH_OPTS[@]}")
  RSH="sshpass -f $(printf '%q' "$PASS_FILE") ssh ${SSH_OPTS[*]}"
  echo "==> using password file ${PASS_FILE}"
else
  echo "==> no ${PASS_FILE} — SSH will prompt"
fi

BUILD=0
LOGS=0
for arg in "$@"; do
  case "$arg" in
    --build|-b) BUILD=1 ;;
    logs|--logs)
      LOGS=1
      ;;
    -h|--help)
      sed -n '2,11p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg  (try --build or logs)" >&2
      exit 1
      ;;
  esac
done

if [[ "$LOGS" -eq 1 ]]; then
  "${SSH[@]}" "$HOST" "cd ${REMOTE} && docker compose --env-file .env.hyraku ps -a && echo '==== hyraku_admin_api ====' && docker compose --env-file .env.hyraku logs --tail=150 hyraku_admin_api"
  exit 0
fi

EXCLUDES=(
  --exclude node_modules
  --exclude dist
  --exclude .venv
  --exclude .env.hyraku
  --exclude .vps-password
  --exclude data
  --exclude __pycache__
  --exclude '*.pyc'
  --exclude .DS_Store
)

echo "==> ${ROOT}/customer  ->  ${HOST}:${REMOTE}/customer"
rsync -az --progress "${EXCLUDES[@]}" -e "$RSH" \
  "$ROOT/customer/" "${HOST}:${REMOTE}/customer/"

echo "==> ${ROOT}/admin  ->  ${HOST}:${REMOTE}/admin"
rsync -az --progress "${EXCLUDES[@]}" -e "$RSH" \
  "$ROOT/admin/" "${HOST}:${REMOTE}/admin/"

for extra in VERSION CHANGELOG.md docker-compose.yml Caddyfile; do
  if [[ -f "$ROOT/$extra" ]]; then
    rsync -az -e "$RSH" "$ROOT/$extra" "${HOST}:${REMOTE}/$extra"
  fi
done

echo "==> files copied"

if [[ "$BUILD" -eq 1 ]]; then
  echo "==> rebuilding customer_frontend, hyraku_admin_web, hyraku_admin_api"
  "${SSH[@]}" "$HOST" "cd ${REMOTE} && docker compose --env-file .env.hyraku up -d --build customer_frontend hyraku_admin_web hyraku_admin_api"
  echo "==> rebuild finished"
else
  echo "Next on the VPS (or re-run with --build):"
  echo "  cd ${REMOTE} && docker compose --env-file .env.hyraku up -d --build customer_frontend hyraku_admin_web hyraku_admin_api"
fi
