# Operations Handbook

Day-2 operations: migrations, seeding, backups/recovery, rollback, environments, secrets, maintenance.
Enough for another engineer to run and maintain Stock Easy independently.

## Database migrations

- **Apply (prod):** `cd apps/api && npm run db:migrate` (`prisma migrate deploy`) — idempotent; applies
  any pending migrations in order. Run on each deploy after the build.
- **Create (dev only):** `npx prisma migrate dev --name <change>` against a dev DB.
- **Never** edit a migration that has been applied to a shared/prod DB. To change applied schema, add a
  **new** migration (roll forward).
- Migrations live in `apps/api/prisma/migrations/`. The two foundational migrations (initial schema +
  the `contracts` migration: idempotency, money, returns/voids, security) are covered by the integration
  suite, which proves they apply cleanly to a real PostgreSQL.

## Seeding

- **Demo data:** `npm run db:seed` → 8 shops, 19 users, 304 medicines, 550 batches, 930 bills.
  Demo password `StockEasy123!`. **Do not** seed a real production tenant database.
- **Verify a seed:** `npm run seed:verify`.
- **Reset (dev):** `npm run db:reset` (⚠️ drops + re-migrates + re-seeds — destructive; dev only).
- Tunables via env: `SEED_PASSWORD`, `SEED_RNG`, `SEED_EMAIL_DOMAIN`, `SEED_HISTORY_DAYS`,
  `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

## Backups & recovery

- Prefer a **managed PostgreSQL** with automated daily backups + point-in-time recovery (Neon, Supabase,
  RDS all provide this) — enable it.
- Self-managed: schedule `pg_dump` (e.g. nightly) to off-host storage; periodically **test restores**
  (`pg_restore` into a scratch DB) — an untested backup is not a backup.
- Recovery: provision a fresh DB, restore the latest good backup, point `DATABASE_URL` at it, redeploy.

## Rollback

| Layer | How |
|---|---|
| Web | Redeploy the previous build (Vercel: promote a prior deployment). |
| API | Redeploy the previous image/release. |
| Database | Roll **forward** with a corrective migration; for data loss, restore from PITR/backup. Never hand-revert applied migrations. |

## Environment separation

- Keep **dev / staging / prod** fully separate: distinct databases, distinct `JWT_*` secrets, distinct
  `CORS_ORIGIN`, distinct `NEXT_PUBLIC_API_URL`.
- Never point a non-prod web build at the prod API, or vice-versa.
- Seed demo data in dev/staging only.

## Secret management

- Secrets live in the host's secret store / env — **never** in the repo. `.env` and `.env.local` are gitignored.
- **Rotate** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `GEMINI_API_KEY` before launch and on any
  suspected exposure. (Rotating JWT secrets invalidates existing sessions — expected.)
- ⚠️ A real Gemini key currently sits in the local `apps/api/.env` (gitignored dev file). **Rotate it**
  and move it to the platform secret store before sharing the repo or deploying.

## Maintenance

- **Dependencies:** review `npm audit --omit=dev --audit-level=high` (the CI gate). The API's full audit
  flags dev-only advisories in the test harness (`testcontainers→dockerode→uuid`) that never ship.
- **`postcss` is pinned** via `apps/web/package.json` `overrides` to a patched 8.x. ⚠️ **Do not run
  `npm audit fix --force`** — it tries to downgrade Next.js to v9.
- **`next lint`** is deprecated for Next 16; migrate to the ESLint CLI when upgrading (see CI note).
- Keep Node ≥ 20 and Prisma on **6.x** (Prisma 7 dropped `url` from the schema datasource).

## Runbook (quick commands)

```bash
# Liveness
curl https://api.yourdomain.com/health

# Apply pending migrations
cd apps/api && npm run db:migrate

# Tail logs — use your platform's log viewer (Pino JSON to stdout)

# Rebuild & restart API
cd apps/api && npm ci && npm run build && npm start

# Reset the DEMO database (dev/staging only — destructive)
cd apps/api && npm run db:reset
```
