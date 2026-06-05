# 🚀 DEPLOY_STOCKEASY.md — Master Deployment Guide

The single document needed to deploy Stock Easy from scratch. Every instruction is derived from
**this repository** (file paths cited). Where something depends on your choices/accounts, it is
flagged **⚠️ VERIFY**.

> 💸 **Want the free, no-domain path?** See **[`docs/DEPLOY_FREE.md`](docs/DEPLOY_FREE.md)** — Vercel
> (web + same-origin proxy) + Render (API) + Neon (DB), $0/month, no custom domain, no auth changes.
> The proxy (`apps/web/next.config.mjs` → `rewrites()`) + `render.yaml` are already wired in the repo.

---

## 0. What the repo actually is (verified)

| Fact | Evidence |
|---|---|
| Monorepo, **no root package.json / Docker / turbo** | repo root = `apps/`, `.github/`, `docs/`, `*.md` |
| **Web:** Next.js 15 App Router | `apps/web/package.json`, `apps/web/next.config.mjs` |
| **API:** Express + TypeScript, compiled with `tsc` → `dist/`, run with `node dist/server.js` | `apps/api/package.json` scripts |
| **DB:** PostgreSQL, Prisma 6; datasource `url = env("DATABASE_URL")` **and `directUrl = env("DIRECT_URL")`** (no `shadowDatabaseUrl`) — **`DIRECT_URL` is required wherever the Prisma CLI runs** | `apps/api/prisma/schema.prisma` |
| **Health:** `GET /health` → `200 {status:"ok"}` (outside `/api/v1`) | `apps/api/src/app.ts` |
| **API listens on `env.PORT`** (default 4000) + graceful SIGTERM | `apps/api/src/server.ts` |
| **Env is fail-fast validated**; required: `DATABASE_URL`, `JWT_ACCESS_SECRET`(≥16), `JWT_REFRESH_SECRET`(≥16), `CORS_ORIGIN`(no `*`) | `apps/api/src/config/env.ts` |
| **No `postinstall`** → `prisma generate` must run in the build step | `apps/api/package.json` |
| Security headers (CSP/HSTS/COOP/CORP…) emitted by the web; CSP `connect-src` derived from `NEXT_PUBLIC_API_URL` | `apps/web/next.config.mjs` |
| CI runs web + api quality + integration tests (does **not** deploy) | `.github/workflows/ci.yml` |

### 🔴 The one fact that decides the architecture — the auth cookie

```ts
// apps/api/src/modules/auth/controller.ts
res.cookie(REFRESH_COOKIE /* "se_refresh" */, token, {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',     // ← decisive
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24*60*60*1000,
});
```

`SameSite=Strict` means the browser only sends the refresh cookie on **same-site** requests
(same registrable domain, e.g. `*.stockeasy.dev`). Consequences:

- ✅ **Works:** `app.yourdomain.com` (web) + `api.yourdomain.com` (API) — same site.
- ❌ **Breaks:** `project.vercel.app` (web) + `project.up.railway.app` (API) — **cross-site**: login
  succeeds, in-session calls work via the in-memory access token, but **token refresh and
  reload-restore fail** (cookie withheld) → users get logged out after ~15 min or on refresh.

> **Therefore a custom domain with `app.`/`api.` subdomains is effectively required for a working,
> no-code-change deployment.** (The only alternative is a 1-line change to `sameSite: 'none', secure: true`,
> which is **out of scope** here — this guide changes no application code.)

---

## 1. Architecture options

| # | Stack | Pros | Cons |
|---|---|---|---|
| 1 | **Vercel + Railway + Neon** | Best Next.js host; Railway = always-on Node (no cold-start), trivial env/deploys; Neon = serverless PG w/ branching + generous free tier; all Git-driven | Three dashboards; Railway is usage-billed |
| 2 | Vercel + Render + Postgres | Render simple; explicit health-check field | Render **free web spins down** (cold starts hurt live demos); paid ($7/mo) to stay warm |
| 3 | Vercel + Supabase | One vendor for DB(+auth/storage if ever needed); great free PG | We don't use Supabase auth/SDK → mostly "just Postgres"; still need a Node host for the API |
| 4 | **VPS + Docker** | One box, full control, cheap ($4–6/mo), strong "I can do ops" signal | You own OS patching, TLS (Caddy/Nginx), backups; **no Dockerfile exists** + `next.config` lacks `output:'standalone'` → you'd add both (a change) |
| 5 | **AWS** (Amplify/ECS + RDS) | Enterprise signal; scales far | Highest complexity/cost; overkill for a portfolio; slow to stand up |
| 6 | Fly.io (API+PG) + Vercel | Single-domain via Fly; global | More moving parts than #1; PG ops on you unless using a managed add-on |

### ✅ Recommendation: **Option 1 — Vercel + Railway + Neon, on one custom domain**

`web → app.yourdomain.com (Vercel)`, `api → api.yourdomain.com (Railway)`, `db → Neon`.

| Criterion | Why option 1 wins |
|---|---|
| Simplicity | All three are Git-connected, zero-server, dashboard-driven |
| Cost | Vercel + Neon free; Railway ~$5/mo; domain ~$1/mo → **≈ $5–6/mo** |
| Reliability | Managed everything; Railway has no spin-down; Neon has PITR/branching |
| Resume value | "Next.js on Vercel, Node API on Railway, serverless Postgres on Neon, custom domain, CI gates" — modern + recognizable |
| Recruiter appeal | Always-on live demo on a real domain (no cold-start "loading…") |
| Scalability | Vercel edge/CDN; Railway vertical scale; Neon autoscaling storage |
| Maintenance | Push-to-deploy; no servers to patch |

The custom domain is the load-bearing requirement (see §0) **and** the biggest recruiter-appeal lever,
so it pays for itself. Render is the closest swap-in for Railway if you prefer a fixed $7/mo.

---

## 2. Frontend deployment — Vercel (`apps/web`)

1. **Import** the GitHub repo in Vercel → **New Project**.
2. **⚠️ VERIFY — set Root Directory = `apps/web`** (monorepo has no root `package.json`; Vercel must
   target the web app). Framework preset auto-detects **Next.js**.
3. Build settings (defaults are correct):
   - Install: `npm ci` · Build: `next build` (i.e. `npm run build`) · Output: `.next` (managed by Vercel)
   - Node: 20 (Project → Settings → Node.js Version)
4. **Environment variables** (Production scope) — see §5:
   - **Same-site (custom domain) path:** `NEXT_PUBLIC_API_URL = https://api.yourdomain.com/api/v1`
     ← inlined at build; redeploy if changed.
   - **Same-origin proxy path (no custom domain, or web+API on different hosts):** set
     `NEXT_PUBLIC_API_URL = /api/v1` **and** `API_PROXY_TARGET = https://<your-api-origin>`. The Next
     server then proxies `/api/*` to the API (`next.config.mjs`), keeping the `SameSite=Strict` refresh
     cookie first-party so login/refresh/reload work across separate hosts with **no code change**
     (full free runbook: `docs/DEPLOY_FREE.md`).
   - `NEXT_PUBLIC_CURRENCY = ₹` (optional)
5. **Domain:** Project → Domains → add `app.yourdomain.com` (DNS in §6). **HTTPS/TLS is automatic.**
6. Security headers ship from `apps/web/next.config.mjs` — **no `vercel.json` needed**.

**Production verification**
```bash
curl -I https://app.yourdomain.com        # 200; check Content-Security-Policy, Strict-Transport-Security present
```
Open the site → sign in → the dashboard renders with data → Network shows `https://api.yourdomain.com/api/v1/*` = 200, no CORS errors.

**Common failures & fixes**
- *Build error "Missing NEXT_PUBLIC_API_URL"* → it's read with a localhost fallback, so build won't fail; but if blank in prod the app calls localhost. **Set it before building.**
- *CORS / blocked requests in console* → `NEXT_PUBLIC_API_URL` origin not in the API's `CORS_ORIGIN`, or scheme mismatch (must be `https`).
- *CSP blocks API calls* → CSP `connect-src` is derived from `NEXT_PUBLIC_API_URL`; a wrong value here is the usual cause.
- *Logged out after a few minutes* → cross-site cookie (§0): web and API are not on the same registrable domain.
- *404 on build* → Root Directory not set to `apps/web`.

---

## 3. Backend deployment — Railway (`apps/api`)

1. Railway → **New Project → Deploy from GitHub repo**.
2. **⚠️ VERIFY — set the service Root Directory to `apps/api`** (Settings → Source).
3. **Build command:**
   ```bash
   npm ci && npm run prisma:generate && npm run build
   ```
   (`prisma generate` is **required** — there is no `postinstall`.)
4. **Start command:**
   ```bash
   npm start          # = node dist/server.js
   ```
5. **Runtime:** Node 20. Railway injects `PORT`; the server reads `env.PORT` ✓. No `trust proxy`
   change needed — `app.set('trust proxy', 1)` is already set.
6. **Health check:** Settings → Healthcheck Path = `/health` (returns 200 with no DB I/O).
7. **Environment variables** — see §5 (DATABASE_URL, JWT_*, CORS_ORIGIN, NODE_ENV=production, GEMINI_API_KEY…).
8. **Run migrations on deploy** — add a **release/deploy command** (Railway: "Deploy" command, or a one-off):
   ```bash
   npm run db:migrate     # prisma migrate deploy  (idempotent)
   ```
   See §7 for the recommended order (migrate before the new code serves traffic).
9. **Domain:** Settings → Networking → Custom Domain → `api.yourdomain.com` (DNS in §6). TLS automatic.
10. **Logging:** Pino writes JSON to stdout → Railway captures it. Set `LOG_LEVEL=info` (default).
11. **Monitoring:** §8. **Scaling:** stateless API → scale vertically (Railway plan) or add replicas;
    sessions are JWT/cookie-based so horizontal scale needs no sticky sessions. The only shared state
    is PostgreSQL (FEFO uses a per-shop advisory lock + row locks, which work across replicas).

**Common failures & fixes**
- *Boots then exits / "Invalid environment configuration"* → a required var is missing/short
  (`config/env.ts` exits(1)); check `JWT_*` ≥ 16 chars and `CORS_ORIGIN` present (no `*`).
- *`@prisma/client did not initialize`* → build didn't run `prisma generate`; fix the build command.
- *DB connection/SSL errors* → append `?sslmode=require` to `DATABASE_URL` (§4).
- *Healthcheck failing* → ensure the path is exactly `/health` and the service binds Railway's `PORT`.
- *CORS errors from the browser* → `CORS_ORIGIN` must equal the web origin exactly: `https://app.yourdomain.com`.

---

## 4. PostgreSQL — Neon

1. Neon → **New Project** (choose a region near the API). It creates a database + role.
2. **Connection string** — Neon gives a pooled and a direct string. The Prisma schema declares **both
   `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`**, so **`DIRECT_URL` is REQUIRED**
   wherever the Prisma CLI runs (`migrate deploy`, `migrate status`, `validate`, `db seed`) — without it
   they fail with error **P1012**. **⚠️ VERIFY — set both** (TLS required → keep `?sslmode=require`):
   ```
   postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/stockeasy?sslmode=require
   ```
   *(Non-pooled DB → set `DIRECT_URL` equal to `DATABASE_URL`. Pooled DB → set `DATABASE_URL` to the
   pooled "-pooler" string and `DIRECT_URL` to the direct, non-pooled string.)*
3. **SSL:** managed Postgres requires TLS → keep `?sslmode=require`.
4. **Migrations:** run from the API host/CI (§5/§7): `npm run db:migrate` (`prisma migrate deploy`).
5. **Seed:** **only for a demo/portfolio DB** — `npm run db:seed` (8 shops, 304 meds, 550 batches,
   930 bills, password `StockEasy123!`). **Never seed a real customer DB.**
6. **Backups / recovery:** enable Neon's history/PITR; use **branches** to test restores. Recovery =
   restore to a branch/timestamp, repoint `DATABASE_URL`, redeploy. (Self-managed alt: nightly `pg_dump`
   to off-host storage + periodic test restores — see `docs/OPERATIONS.md`.)
7. **Cost:** Neon free tier is ample for portfolio/pilot; paid tiers add compute/storage/branches.

---

## 5. Environment variables — production checklist

### API service (Railway)

| Variable | Purpose | Example | Secret? | Where | Service |
|---|---|---|---|---|---|
| `NODE_ENV` | Enables prod behavior incl. **Secure** cookies (`secure:isProd`) | `production` | no | Railway | API |
| `DATABASE_URL` | Postgres connection (Prisma Client + CLI) | `postgresql://u:p@ep-x.neon.tech/stockeasy?sslmode=require` | **YES** | Railway | API |
| `DIRECT_URL` | **Required by the schema (`directUrl`)** for all Prisma CLI cmds (migrate/seed/validate); non-pooled DB → same value as `DATABASE_URL` | `postgresql://u:p@ep-x.neon.tech/stockeasy?sslmode=require` | **YES** | Railway | API |
| `JWT_ACCESS_SECRET` | Signs access tokens (≥16 chars) | 96-hex (see gen cmd) | **YES** | Railway | API |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (≥16 chars, distinct) | 96-hex | **YES** | Railway | API |
| `CORS_ORIGIN` | Credentialed-request allowlist (no `*`) | `https://app.yourdomain.com` | no | Railway | API |
| `GEMINI_API_KEY` | AI assistant; `/ai` → 503 until set | `AIza…` / `AQ.…` | **YES** | Railway | API |
| `PORT` | Listen port | injected by Railway | no | Railway (auto) | API |
| `ACCESS_TOKEN_TTL_SECONDS` | Access-token lifetime | `900` | no | Railway (opt) | API |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh lifetime + cookie maxAge | `30` | no | Railway (opt) | API |
| `BCRYPT_ROUNDS` | Password hash cost (8–15) | `12` | no | Railway (opt) | API |
| `LOG_LEVEL` | Pino level | `info` | no | Railway (opt) | API |
| `AI_PROVIDER` / `AI_MODEL` | Assistant provider/model | `gemini` / `gemini-2.5-flash` | no | Railway (opt) | API |

### Web project (Vercel)

| Variable | Purpose | Example | Secret? | Where | Service |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base incl. `/api/v1`; **inlined at build** | `https://api.yourdomain.com/api/v1` | no (public) | Vercel (Production) | Web |
| `NEXT_PUBLIC_CURRENCY` | Display currency symbol | `₹` | no | Vercel (opt) | Web |

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 6. Domain & DNS

**Why a custom domain is required:** same-registrable-domain subdomains make web↔API **same-site**, so
the `SameSite=Strict` refresh cookie works (§0).

1. **Buy** a domain (Namecheap, Cloudflare Registrar, Porkbun…) — ~$10–12/yr. **⚠️ VERIFY** you own it.
2. **DNS records** (at your registrar / Cloudflare):
   - `app` → Vercel: a **CNAME** `app` → `cname.vercel-dns.com` (Vercel shows the exact target).
   - `api` → Railway: a **CNAME** `api` → the target Railway shows for the custom domain.
   - (Apex `yourdomain.com` → optional redirect to `app.`)
3. **SSL:** both Vercel and Railway issue/renew Let's Encrypt certs automatically once DNS resolves.
4. **Production URL structure:**
   - Web app: `https://app.yourdomain.com`
   - API: `https://api.yourdomain.com` → health `https://api.yourdomain.com/health`, API `…/api/v1/*`
5. **Wire them together:** `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1` (Vercel) and
   `CORS_ORIGIN=https://app.yourdomain.com` (Railway).

---

## 7. Prisma deployment

- **Workflow:** author migrations locally (`prisma migrate dev`) → commit `apps/api/prisma/migrations/`
  → apply in prod with **`prisma migrate deploy`** (idempotent; applies only pending ones).
- **Production execution:** run **before** the new code serves traffic:
  ```bash
  cd apps/api && npm run db:migrate    # prisma migrate deploy
  ```
  On Railway, set this as the deploy/release command, or run once via a one-off command/shell.
- **Rollback:** migrations are additive — **roll forward** with a corrective migration. Never edit an
  applied migration. For data loss, restore from Neon PITR/branch (§4).
- **Seed:** `npm run db:seed` (demo only) · verify with `npm run seed:verify`.
- **Verification:** `npx prisma migrate status` (shows applied vs pending). The integration suite proves
  both migrations apply cleanly to a real PostgreSQL.

---

## 8. Monitoring & observability

- **Health monitoring:** point an uptime monitor (Better Stack, UptimeRobot, or Railway's healthcheck)
  at `https://api.yourdomain.com/health`. Vercel reports web availability.
- **Logs:** Pino JSON → Railway log viewer; filter by the request-id field for tracing. Vercel captures
  web runtime/function logs.
- **Error monitoring (Sentry — ready, see `docs/OBSERVABILITY.md`):**
  - Web: `cd apps/web && npx @sentry/wizard@latest -i nextjs`; set `NEXT_PUBLIC_SENTRY_DSN`; **add the
    Sentry ingest origin to CSP `connect-src` in `next.config.mjs`**.
  - API: `npm i @sentry/node`; init guarded by `process.env.SENTRY_DSN` at the top of `src/server.ts`;
    `Sentry.captureException(err)` in the existing `errorHandler` (single edit point). Forward from
    `app/global-error.tsx` on the web.
- **Alerting:** Sentry issue alerts (new/spike) + uptime-monitor downtime alerts to email/Slack.
- **Performance:** Vercel Speed Insights / Web Vitals for the web; Sentry Performance for API latency.
  Baseline (this build): Lighthouse `/login` = 94/95/96/100.

---

## 9. CI/CD

The repo's `.github/workflows/ci.yml` runs **3 jobs on every PR + push to `main`**: `web`
(typecheck·lint·build·prod-audit), `api-quality` (typecheck·build·prod-audit), `api-tests`
(Vitest + Testcontainers/PostgreSQL 16). It is a **quality gate, not a deployer**.

- **Deployment trigger:** Vercel and Railway each connect to the GitHub repo and **auto-deploy on push
  to `main`**; PRs get **Vercel preview deployments**.
- **Branch strategy:** `main` = production. Feature branches → PR → CI + preview → merge.
- **Make CI a true gate:** enable **branch protection on `main`** requiring the `web`, `api-quality`,
  and `api-tests` checks to pass before merge → `main` is always green before it auto-deploys.
- **Production promotion:** Vercel auto-promotes `main`; for manual control, use "Promote to Production"
  on a chosen deployment. Railway promotes the latest `main` build.
- **Rollback:** Vercel → **Instant Rollback** to a prior deployment. Railway → redeploy a prior
  deployment. DB → roll forward / PITR (§7).
- **Release process:** tag releases (`vX.Y.Z`) + keep a CHANGELOG; run DB migrations as part of the
  release before traffic shifts.

---

## 10. Pre-launch security checklist

- [ ] **Secret rotation:** fresh `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (not the dev defaults in `.env.example`).
- [ ] **Gemini key:** the real key currently in local `apps/api/.env` is a **dev** key — **rotate it** and set the new one only in Railway's secret store; never commit.
- [ ] **Cookies:** `NODE_ENV=production` → refresh cookie is `Secure`; it is `SameSite=Strict` → web+API on the **same registrable domain** (§0).
- [ ] **CORS:** `CORS_ORIGIN=https://app.yourdomain.com` exactly (scheme + host); confirm `"*"` is not used.
- [ ] **HTTPS:** both subdomains serve HTTPS; HTTP redirects to HTTPS (Vercel/Railway default).
- [ ] **CSP / headers:** `curl -I https://app.yourdomain.com` shows `Content-Security-Policy`,
      `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `COOP`/`CORP`; `X-Powered-By` absent.
- [ ] **Dependency audit:** `npm audit --omit=dev --audit-level=high` clean in **both** apps (CI enforces this).
- [ ] **DB:** `?sslmode=require`; consider enabling RLS (`apps/api/prisma/rls.sql`) + running under the non-superuser role.
- [ ] **No secrets in the web bundle** (verified once; re-confirm after adding Sentry).

---

## 11. Launch-day procedure (in order)

```text
1. DATABASE   Neon: create project → copy DIRECT connection string → append ?sslmode=require
2. CONFIG     Railway: set API env (§5). Vercel: set NEXT_PUBLIC_API_URL (+ optional currency).
              Generate JWT secrets; set CORS_ORIGIN=https://app.yourdomain.com; NODE_ENV=production.
3. MIGRATE    From CI or `cd apps/api && npm run db:migrate`  → npx prisma migrate status (no pending)
4. SEED       (demo/portfolio only) `npm run db:seed`  → `npm run seed:verify`
5. BACKEND    Railway deploy apps/api: build=`npm ci && npm run prisma:generate && npm run build`,
              start=`npm start`, healthcheck=/health  → wait for green
6. FRONTEND   Vercel deploy apps/web (Root Directory apps/web) → wait for build success
7. DNS        Add CNAMEs: app→Vercel, api→Railway; wait for TLS to issue
8. MONITORING Uptime monitor on /health; (optional) Sentry DSNs; confirm logs flowing
9. SMOKE      curl https://api.yourdomain.com/health  → 200
              Sign in at https://app.yourdomain.com  → dashboard loads with data
10. SIGN-OFF  Run §12; record build SHAs / deployment URLs; tag the release
```

---

## 12. Post-deployment validation

Run against production (creds from the seed: `StockEasy123!`).

| # | Check | Pass criteria |
|---|---|---|
| 1 | **Health** | `GET https://api.yourdomain.com/health` → 200 `{status:"ok"}` |
| 2 | **Login** | sign-in succeeds; **reload the page** → still logged in (proves the cross-site cookie works — §0) |
| 3 | **Admin** (`admin@stockeasy.app`) | sees Platform Analytics / Approvals / Tenants / Plans |
| 4 | **Owner** (`owner.apollo@stockeasy.test`) | dashboard KPIs, charts, FEFO alerts render |
| 5 | **Staff** (`staff1.apollo@stockeasy.test`) | POS + day-to-day nav; admin routes not available |
| 6 | **Inventory** | Medicines list loads (table on desktop, cards on mobile); add/edit works |
| 7 | **POS** | add items → complete a sale → bill created; FEFO consumes nearest-expiry batch |
| 8 | **Analytics** | charts + tables load; date-range switch works |
| 9 | **AI assistant** | with `GEMINI_API_KEY` set → answers; without → clean 503 (no crash) |
| 10 | **Subscriptions** | plan/subscription status renders; admin plan manager works |
| 11 | **Error monitoring** | (if Sentry enabled) trigger a test error → appears in Sentry |
| 12 | **Performance** | Lighthouse on `https://app.yourdomain.com/login` ≥ 90 across the board |
| 13 | **Security headers** | `curl -I` shows CSP/HSTS/XFO/CTO/COOP/CORP; no `X-Powered-By` |
| 14 | **CORS/cookies** | no console CORS errors; `se_refresh` cookie set on `api.` host, `Secure`+`HttpOnly` |

---

## 13. Cost analysis (recommended stack)

| Tier | Web (Vercel) | API (Railway) | DB (Neon) | Domain | **Total** |
|---|---|---|---|---|---|
| **Hobby / portfolio** | Hobby — **$0** | ~**$5**/mo (usage; small always-on service) | Free | ~$1/mo (≈$12/yr) | **≈ $6/mo** |
| **Small production (pilot)** | Pro $20/mo (or Hobby $0 if within limits) | $10–20/mo (more RAM/replicas) | Launch ~$19/mo | ~$1/mo | **≈ $30–60/mo** |
| **Free-tier-only** ⚠️ | $0 | Render free (cold starts) / Railway trial | $0 | **$0 — but no custom domain → cross-site → auth refresh breaks (§0)** | $0 (not viable as-is) |

> The free-tier-only path is **not viable without a custom domain** (or the 1-line cookie change),
> because of `SameSite=Strict`. Budget the ~$1/mo domain — it is also the biggest recruiter-appeal upgrade.

---

## 14. ⚠️ Things to verify before you start (cannot be confirmed from code alone)

1. You **own a domain** (or will buy one) — required for the no-code-change path (§0/§6).
2. **Railway service Root Directory = `apps/api`** and **Vercel Root Directory = `apps/web`** (monorepo).
3. **Neon: set BOTH `DATABASE_URL` and `DIRECT_URL`.** The schema declares `directUrl`, so the Prisma CLI requires `DIRECT_URL` (non-pooled DB → same value as `DATABASE_URL`; §4).
4. The **Gemini key** you deploy is a freshly rotated production key (not the local dev one).
5. If you instead want the **bare `*.vercel.app` + `*.railway.app`** (no domain) path, you must change
   `apps/api/src/modules/auth/controller.ts` to `sameSite:'none', secure:true` — **a code change this
   guide deliberately does not make.**

---

*Companion docs: `docs/DEPLOYMENT.md` (overview), `docs/ENVIRONMENT.md`, `docs/OPERATIONS.md`,
`docs/OBSERVABILITY.md`, `docs/ARCHITECTURE.md`, `PRODUCTION_READINESS.md`.*
