#!/usr/bin/env python3
"""Password-file transport for deploy-vps.sh when rsync/sshpass are missing."""

from __future__ import annotations

import io
import os
import sys
import tarfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("HYRAKU_VPS_HOST", "root@15.235.145.222")
PORT = int(os.environ.get("HYRAKU_VPS_PORT", "20115"))
REMOTE = os.environ.get("HYRAKU_VPS_DIR", "/opt/hyraku")
PASS_FILE = Path(os.environ.get("HYRAKU_VPS_PASSWORD_FILE", ROOT / ".vps-password"))
EXCLUDES = {
    "node_modules",
    "dist",
    ".venv",
    "data",
    "__pycache__",
    ".env.hyraku",
    ".vps-password",
    ".DS_Store",
}


def _user_host() -> tuple[str, str]:
    if "@" in HOST:
        user, host = HOST.split("@", 1)
        return user, host
    return "root", HOST


def _password() -> str:
    raw = PASS_FILE.read_bytes().replace(b"\r", b"").replace(b"\n", b"")
    if not raw:
        raise SystemExit("password file is empty")
    return raw.decode("utf-8", "strict")


def _skip(name: str) -> bool:
    parts = Path(name).parts
    if any(part in EXCLUDES for part in parts):
        return True
    return Path(name).suffix == ".pyc"


def _connect() -> paramiko.SSHClient:
    user, host = _user_host()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        port=PORT,
        username=user,
        password=_password(),
        allow_agent=False,
        look_for_keys=False,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
    )
    return client


def _run(client: paramiko.SSHClient, command: str) -> None:
    print(f"==> remote: {command}", flush=True)
    _stdin, stdout, stderr = client.exec_command(command)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out, end="" if out.endswith("\n") else "\n", flush=True)
    if err:
        print(err, end="" if err.endswith("\n") else "\n", file=sys.stderr, flush=True)
    if code != 0:
        raise SystemExit(f"remote command failed ({code}): {command}")


def _put_tree(client: paramiko.SSHClient, local: Path, dest: str) -> None:
    print(f"==> {local}  ->  {dest}", flush=True)
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in local.rglob("*"):
            rel = path.relative_to(local).as_posix()
            if _skip(rel):
                continue
            tar.add(path, arcname=rel, recursive=False)
    payload = buf.getvalue()
    _run(client, f"mkdir -p {dest}")
    stdin, stdout, stderr = client.exec_command(f"tar xzf - -C {dest}")
    stdin.write(payload)
    stdin.channel.shutdown_write()
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if err:
        print(err, end="" if err.endswith("\n") else "\n", file=sys.stderr, flush=True)
    if code != 0:
        raise SystemExit(f"extract failed in {dest} ({code})")


def _put_file(client: paramiko.SSHClient, local: Path, dest: str) -> None:
    print(f"==> {local.name}  ->  {dest}", flush=True)
    sftp = client.open_sftp()
    try:
        sftp.put(str(local), dest)
    finally:
        sftp.close()


def main() -> None:
    build = "--build" in sys.argv or "-b" in sys.argv
    client = _connect()
    try:
        _put_tree(client, ROOT / "customer", f"{REMOTE}/customer")
        _put_tree(client, ROOT / "admin", f"{REMOTE}/admin")
        for name in ("VERSION", "CHANGELOG.md", "docker-compose.yml", "Caddyfile"):
            path = ROOT / name
            if path.is_file():
                _put_file(client, path, f"{REMOTE}/{name}")
        print("==> files copied", flush=True)
        if build:
            print("==> rebuilding customer_frontend, hyraku_admin_web, hyraku_admin_api", flush=True)
            _run(
                client,
                f"cd {REMOTE} && docker compose --env-file .env.hyraku up -d --build "
                "customer_frontend hyraku_admin_web hyraku_admin_api",
            )
            print("==> rebuild finished", flush=True)
        else:
            print(f"Next on the VPS (or re-run with --build):", flush=True)
            print(
                f"  cd {REMOTE} && docker compose --env-file .env.hyraku up -d --build "
                "customer_frontend hyraku_admin_web hyraku_admin_api",
                flush=True,
            )
    finally:
        client.close()


if __name__ == "__main__":
    main()
