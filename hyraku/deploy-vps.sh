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

if [[ -f "$PASS_FILE" ]]; then
  chmod 600 "$PASS_FILE" || true
  SSH_OPTS=(-o IdentitiesOnly=yes -o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=1 -o StrictHostKeyChecking=accept-new)
  if command -v sshpass >/dev/null 2>&1; then
    SSH=(sshpass -f "$PASS_FILE" ssh -p "$PORT" "${SSH_OPTS[@]}")
    RSH="sshpass -f $(printf '%q' "$PASS_FILE") ssh -p $PORT ${SSH_OPTS[*]}"
    SCP=(sshpass -f "$PASS_FILE" scp -P "$PORT" "${SSH_OPTS[@]}")
    echo "==> using password file ${PASS_FILE} (sshpass)"
  else
    if command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1; then
      PY="$(command -v python3 2>/dev/null || command -v python)"
      echo "==> using password file ${PASS_FILE} (python paramiko)"
      exec "$PY" "$ROOT/deploy-vps-py.py" "$@"
    fi
    echo "Need sshpass or Python paramiko to use ${PASS_FILE}" >&2
    exit 1
  fi
else
  echo "==> no ${PASS_FILE} — using default SSH keys"
  SSH_OPTS=(-p "$PORT" -o BatchMode=yes -o ConnectTimeout=20)
  SSH=(ssh "${SSH_OPTS[@]}")
  RSH="ssh ${SSH_OPTS[*]}"
  SCP=(scp -P "$PORT" -o BatchMode=yes -o ConnectTimeout=20)
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
  --exclude backend/data
  --exclude __pycache__
  --exclude '*.pyc'
  --exclude .DS_Store
)

copy_tree() {
  local src="$1" dest="$2"
  if command -v rsync >/dev/null 2>&1; then
    rsync -az --checksum --progress "${EXCLUDES[@]}" -e "$RSH" "$src/" "${HOST}:${dest}/"
    return
  fi
  echo "==> rsync not found; staging with tar and scp"
  local stage
  stage="$(mktemp -d)"
  mkdir -p "$stage/tree"
  tar -C "$src" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.venv \
    --exclude=data \
    --exclude=__pycache__ \
    --exclude='*.pyc' \
    --exclude=.DS_Store \
    --exclude=.env.hyraku \
    --exclude=.vps-password \
    -cf - . | tar -C "$stage/tree" -xf -
  "${SSH[@]}" "$HOST" "mkdir -p $(printf '%q' "$dest")"
  "${SCP[@]}" -r "$stage/tree/." "${HOST}:${dest}/"
  rm -rf "$stage"
}

echo "==> ${ROOT}/customer  ->  ${HOST}:${REMOTE}/customer"
copy_tree "$ROOT/customer" "${REMOTE}/customer"

echo "==> ${ROOT}/admin  ->  ${HOST}:${REMOTE}/admin"
copy_tree "$ROOT/admin" "${REMOTE}/admin"

for extra in VERSION CHANGELOG.md docker-compose.yml Caddyfile; do
  if [[ -f "$ROOT/$extra" ]]; then
    if command -v rsync >/dev/null 2>&1; then
      rsync -az -e "$RSH" "$ROOT/$extra" "${HOST}:${REMOTE}/$extra"
    else
      "${SCP[@]}" "$ROOT/$extra" "${HOST}:${REMOTE}/$extra"
    fi
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
