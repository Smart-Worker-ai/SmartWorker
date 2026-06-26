# CI/CD Plan

> Builds on what exists: `worker_website/.github/workflows/ci.yml` (real, tests
> backend+frontend, builds Docker images) and the SSH-deploy snippet drafted in
> `DEPLOY.md`. No root-level workflow exists yet; this plan adds one.

---

## 1. Git workflow

- **Trunk-based with short-lived feature branches.** `master` is the deployable trunk (current default branch).
- Branch naming: `feat/…`, `fix/…`, `chore/…`. PR into `master`, squash-merge.
- **Protect `master`:** require the CI status check + 1 review; no direct pushes.
- 🔴 **Before anything:** the repo has live secrets in `PROJECT_REFERENCE.md` and (per `PROJECT_REFERENCE.md`) **no GitHub remote**. Purge secrets from history (`git filter-repo`) **before** pushing to GitHub, then add the remote. Pushing as-is publishes the Gmail app password and admin password.
- Tag releases `vMAJOR.MINOR.PATCH`. Flutter apps already carry their own build versions (`pubspec.yaml`: customer `1.0.0+1`, worker `0.1.1+2`).

---

## 2. Build pipeline (per-service, monorepo path filters)

Use GitHub Actions with `paths:` filters so each service builds only when it changes. Existing `worker_website/ci.yml` already does backend (pytest, Postgres service) + frontend (vite build) + docker build — generalise that pattern to all services:

| Service | Build / check |
|---|---|
| node_backend | `npm ci`, `npm run check` (node --check), docker build |
| worker_backend | `pip install -r requirements.txt`, `pytest`, `alembic upgrade head` against PG service, black/flake8, docker build |
| admin_backend | `pip install`, `pytest`, lint, docker build |
| sms-gateway | `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (jest), `npm run build` (tsc), docker build ×2 (api + worker) |
| frontends ×2 | `npm ci`, `npm run build` (vite) — Vercel also builds on its side |
| Flutter ×2 | `flutter analyze`, `flutter test`, `flutter build apk --release` |

---

## 3. Testing stages

- **Unit/integration:** sms-gateway has jest (`--passWithNoTests` today — add real tests for HMAC, provider failover, OTP). worker_backend has pytest in CI. node_backend has only `node --check` — **add a test suite** (auth, booking, admin-secret guard) before it's the customer system-of-record.
- **Migration test:** run `alembic upgrade head` against an ephemeral Postgres in CI (worker_backend already does via the PG service container).
- **Lint/format gate:** black+flake8 (Py), eslint+tsc (TS), `flutter analyze`.
- **Build gate:** docker build must succeed for every changed service; vite build for SPAs.
- A `status` job gates merge on all of the above (the existing worker CI already has this gate pattern).

---

## 4. Artifact generation

- **Docker images** → push to **GHCR** (`ghcr.io/<org>/<service>:<git-sha>` + `:latest`). `.env.example` already anticipates `IMAGE_REGISTRY`.
- **Flutter APK/AAB** → uploaded as workflow artifact; release build → **Firebase App Distribution** (`deploy.sh` already does the customer-app distribute; worker app per `PROJECT_REFERENCE.md`).
- **SPA bundles** → Vercel/Pages build their own from the pushed commit.

Tag images by **immutable git SHA** (not just `latest`) so rollback = redeploy a known SHA.

---

## 5. Deployment process

**Backends (VM, Docker Compose):** on push to `master` after CI passes, the deploy job SSHes in and pulls + recreates (the `DEPLOY.md` `appleboy/ssh-action` snippet):

```yaml
# .github/workflows/deploy.yml (root — to add)
on: { push: { branches: [master] } }
jobs:
  deploy:
    needs: [ci]          # gate on the build/test workflow
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/deploy/SmartWorker
            git pull --ff-only
            docker compose pull            # if using GHCR images
            docker compose up -d --build
            docker compose ps
```

Prefer **pull pre-built GHCR images** over building on the VM (faster, deterministic, less VM CPU). worker_backend runs `alembic upgrade head` automatically on container start, so migrations apply as part of `up -d`.

**SPAs:** Vercel/Pages auto-deploy on push (preview per PR, production on `master`).

**Mobile:** manual/tagged — `flutter build` → Firebase App Distribution → (later) Play Store internal track.

### Deploy ordering (matters because of shared secrets & migrations)
1. Postgres migrations (worker_backend boots them).
2. node_backend (sync target) — must be up before admin/worker fire syncs.
3. sms-gateway (worker_backend depends on it for OTP).
4. worker_backend, admin_backend.
Rotating `ADMIN_SECRET`/`HMAC_SECRET` requires updating both ends **in the same deploy** or cross-calls 403.

---

## 6. Rollback strategy

- **Images:** `docker compose` pinned to the previous git-SHA tag → `docker compose up -d`. Fast, clean.
- **Source mode:** `git checkout <prev-sha> && docker compose up -d --build` (the `DEPLOY.md` procedure).
- **DB migrations are forward-only** — a rollback that crosses a migration needs `alembic downgrade -1` (worker_backend) or a restore from the pre-deploy backup. **Always take a pre-deploy DB snapshot** (`04_DATABASE.md`) so you can roll back data, not just code.
- **SPAs:** Vercel "Promote previous deployment" — instant.
- **Mobile:** can't roll back a shipped APK; gate releases behind staged rollout in Play Console.

---

## 7. Versioning & release management

- **Semantic versioning** with git tags; image tags = git SHA (immutable) + semver tag.
- **Environments:** at least `staging` (a second cheap VM or a Compose profile) before `production`. Run the full migration + smoke test on staging first — critical given node_backend will be carrying the live customer DB.
- **Release checklist** per ship: CI green → staging deploy → smoke test (`/health` ×4, login, booking, worker approval→sync, OTP) → pre-deploy backup → production deploy → post-deploy smoke → tag release.
- **Changelog** generated from squash-merge PR titles (conventional-commit style).
