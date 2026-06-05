# Stock Easy — Repository Architecture & Deployment Reference

> **Definitive, evidence-based reference** for deploying, maintaining, troubleshooting, and scaling
> Stock Easy. Every statement below was derived from reading the actual repository at
> `C:\Users\shaya\OneDrive\Desktop\stock-easy` and, where noted, from running commands against it.
> Anything that could not be confirmed from the code is explicitly marked **`NOT VERIFIED`**.
>
> **Audience:** the repository owner (non-engineer), future Claude/ChatGPT/Cursor/Windsurf/Gemini
> sessions, and any developer.
>
> **Document status:** Generated 2026-06-05 (audit). **Updated 2026-06-05** to record the config/doc
> remediation of both deploy blockers (see the "REMEDIATION APPLIED" box below). No application logic
> was changed — only configuration (`apps/api/.env.example`, `render.yaml`, `apps/web/.env.example`) and
> the deploy guides (`DEPLOY_STOCKEASY.md`, `docs/DEPLOY_FREE.md`).

---

## ⛔ READ THIS FIRST — Two deploy-critical findings (now REMEDIATED in config)

Both are **verified from source** and one is **proven by running Prisma**. They override anything the
other docs in this repo say.

> ### ✅ REMEDIATION APPLIED — 2026-06-05 (configuration + docs only; no app logic changed)
> Both blockers were fixed at the configuration/documentation layer in this repo:
> - **Blocker 1 (`DIRECT_URL`):** now declared in `apps/api/.env.example` and `render.yaml`
>   (`- key: DIRECT_URL` / `sync: false`); the 5 stale "no directUrl" doc lines were corrected and a
>   `DIRECT_URL` row added to the env tables in both deploy guides.
>   **Re-verified:** `DIRECT_URL=… npx prisma validate` → *valid 🚀*; `… migrate status` → *Database
>   schema is up to date!* (no P1012).
> - **Blocker 2 (`SameSite=Strict` cookie):** the in-repo Next `/api/*` proxy is **unchanged** (no code
>   change); its activation var **`API_PROXY_TARGET`** is now documented in `apps/web/.env.example` and
>   `DEPLOY_STOCKEASY.md` §2 (and was already in `docs/DEPLOY_FREE.md`).
>
> **Two residual items still require action — they are NOT auto-fixed:**
> 1. **Set the values at deploy time.** The repo now *declares* these vars; you must still paste the
>    actual `DIRECT_URL` connection string into the Render/Railway dashboard (and your CI / local shell),
>    and set `API_PROXY_TARGET` + `NEXT_PUBLIC_API_URL=/api/v1` on Vercel.
> 2. **`env.ts` and the test harness were intentionally left unchanged.** `config/env.ts` does **not**
>    enforce `DIRECT_URL` (adding it as required would `exit(1)` the Vitest suite, which never sets it —
>    see [Risk D1](#d1)), so the **server still boots without it**; but the **integration tests /
>    CI `api-tests` job still fail** until `DIRECT_URL` is provided to `tests/setup/global-setup.ts`
>    (one line: pass `DIRECT_URL: url` to its `migrate deploy` env). Full opt-in recipe in [Risk D1](#d1).

### 🔴 BLOCKER 1 — `DIRECT_URL` is required by the schema but defined nowhere (NEW; contradicts the repo's own docs)

`apps/api/prisma/schema.prisma:24` declares:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // ← line 24
}
```

At audit time `DIRECT_URL` was **absent** from `apps/api/.env`, `apps/api/.env.example`, `render.yaml`,
and the env validator `apps/api/src/config/env.ts`. **(Remediated 2026-06-05:** it is now declared in
`.env.example` and `render.yaml`; it is still **not** in `config/env.ts` by design, and remains unset in
the gitignored local `apps/api/.env`.) Every Prisma CLI command loads and validates the datasource
**before doing anything**, so a missing `DIRECT_URL` fails them all. **Proven** against this repo
(Prisma 6.19.3):

```text
$ npx prisma migrate status      →  Error code: P1012
$ npx prisma validate            →  error: Environment variable not found: DIRECT_URL.
                                       -->  prisma\schema.prisma:24
$ DIRECT_URL=...  npx prisma validate  →  The schema at prisma\schema.prisma is valid 🚀
```

**What breaks:** `prisma migrate deploy` (the `npm run db:migrate` step in `render.yaml`'s build
command), `prisma migrate status`, `prisma validate`, `prisma db seed` (`npm run db:seed`), **and** the
integration-test harness (`apps/api/tests/setup/global-setup.ts:79` runs `npx prisma migrate deploy`
passing only `DATABASE_URL`). **What survives:** `prisma generate`, `tsc` build, and the running server
(`node dist/server.js`), because Prisma Client uses only `url` at runtime — `directUrl` is CLI-only.

> ✅ **Stale docs corrected (2026-06-05):** five lines that claimed "the schema has **no** `directUrl`" —
> in `DEPLOY_STOCKEASY.md` (the fact row, the §4 connection-string step, and §14 item 3) and
> `docs/DEPLOY_FREE.md` (Step 1) — now correctly state that `DIRECT_URL` is **required** wherever the
> Prisma CLI runs. (Historical note: those lines pre-dated the `directUrl` schema line.)

**The fix — applied 2026-06-05 (config) + what you still do at deploy time:**
- ✅ **Declared** `DIRECT_URL` in `apps/api/.env.example` and `render.yaml` (with non-pooled vs pooled
  guidance). The `schema.prisma` `directUrl` line was deliberately **kept** (it enables future pooling).
- ⏭️ **You still set the value** everywhere the Prisma CLI runs: paste the connection string into the
  Render/Railway dashboard, your CI env, and your local shell (or local `apps/api/.env`). Non-pooled DB
  → `DIRECT_URL = DATABASE_URL`; pooled DB (Neon `-pooler`) → `DATABASE_URL` = pooled, `DIRECT_URL` =
  direct (non-pooled) string.
- 🚫 **`config/env.ts` was NOT changed** (requiring `DIRECT_URL` there crashes the Vitest suite, which
  never sets it). So the server boots without it, but the **test/CI harness still needs a one-line
  `global-setup.ts` fix** — see [Section 11, Risk D1](#d1).

This document's checklists assume the value is set at deploy time. See [Section 11, Risk D1](#d1).

### 🔴 BLOCKER 2 — the refresh cookie is `SameSite=Strict`, so a naive cross-host split logs users out

`apps/api/src/modules/auth/controller.ts:15-23` hardcodes the refresh cookie as `sameSite: 'strict'`,
and the web client's silent-refresh call (`apps/web/src/services/api/client.ts:36-45`) sends an **empty
body** and relies entirely on that cookie. Strict cookies are **not sent on cross-site requests**, so if
the browser talks to the API on a *different registrable domain* (e.g. `*.vercel.app` → `*.onrender.com`),
token refresh and reload-restore fail → users get logged out after ~15 min or on any page reload.

**The repo already ships the fix** (no code change needed): `apps/web/next.config.mjs` proxies `/api/*`
through the Next.js app to the API, driven by `process.env.API_PROXY_TARGET`. Point the browser at the
**web origin** and the cookie stays first-party. ✅ **As of 2026-06-05 the activation is documented** in
`apps/web/.env.example` and `DEPLOY_STOCKEASY.md` §2. To activate it at deploy time, set on the web host:
`API_PROXY_TARGET=<api origin>` and `NEXT_PUBLIC_API_URL=/api/v1`. The alternative is putting web + API on
one custom domain (`app.x.com` + `api.x.com`). See
[Section 5](#section-5--authentication-and-security-analysis) and [Risk A1](#a1).

---

## Table of contents

1. [Executive summary](#section-1--executive-summary)
2. [Complete folder structure analysis](#section-2--complete-folder-structure-analysis)
3. [Application architecture (diagrams)](#section-3--application-architecture)
4. [Database analysis](#section-4--database-analysis)
5. [Authentication & security analysis](#section-5--authentication-and-security-analysis)
6. [Environment variables](#section-6--environment-variables)
7. [Deployment options comparison](#section-7--deployment-options-comparison)
8. [Recommended deployment plan](#section-8--recommended-deployment-plan)
9. [Deployment checklist](#section-9--deployment-checklist)
10. [Service configuration reference](#section-10--service-configuration-reference)
11. [Deployment risks](#section-11--deployment-risks)
12. [Operational handbook](#section-12--operational-handbook)
13. [Agent handoff document](#section-13--agent-handoff-document)
14. [Final recommendation](#section-14--final-recommendation)
15. [Deployment quick start guide](#deployment-quick-start-guide-one-page)

---

## SECTION 1 — EXECUTIVE SUMMARY

*(Written for a non-technical founder.)*

**What it is.** Stock Easy is an online software product ("SaaS") that pharmacies use to run their
day-to-day inventory and sales. One pharmacy signs up, gets verified, and then manages its medicines,
suppliers, stock batches, and over-the-counter sales — all in a clean web app.

**The problem it solves.** Medicines expire. A pharmacy that sells from the *wrong* box lets the
soon-to-expire box rot on the shelf and throws money away. Stock Easy's headline feature is **FEFO —
"First-Expiry, First-Out."** Every sale automatically takes stock from the batch that expires *soonest*,
so medicine sells before it becomes waste. (Verified: `apps/api/src/modules/batches/fefo.ts`,
`apps/api/src/modules/billing/service.ts`.)

**Who uses it (three roles).** Verified in `apps/api/prisma/schema.prisma` (`UserRole` enum) and
`apps/web/src/lib/nav-config.ts`:
- **Central Admin** (the platform operator — you): verifies/approves new pharmacies, sees platform-wide
  analytics, manages subscription plans and tenants. Not tied to any one shop.
- **Shop Owner**: runs one pharmacy — full access to inventory, sales, analytics, AI, settings, staff,
  and the subscription.
- **Shop Staff**: front-counter user — can sell and do day-to-day work, but not owner-only settings.

**Major business workflows** (each verified to exist as code):
1. **Onboard** — an owner registers their pharmacy (creates a `pending` shop) → the Central Admin
   approves it → selling unlocks. (`auth/service.ts` `register`, `admin/routes.ts`, `requireApprovedShop`.)
2. **Stock in** — add medicines, suppliers ("dealers"), and stock **batches** with expiry dates.
3. **Sell (POS)** — ring up a sale; FEFO picks the nearest-expiry batch automatically; a bill is created.
4. **Returns & voids** — reverse a sale; exact batches are restocked and refunds computed.
5. **Analyze** — dashboards for revenue, top medicines, low stock, expiring-soon, dead stock, valuation.
6. **Ask the AI** — type a plain-English question ("what's expiring this month?") and get an answer.
7. **Subscribe** — pharmacies sit on plan tiers (Trial/Basic/Pro); admin manages the plan catalogue.

**Main technical features.** A typed REST API (`/api/v1/...`), money handled as exact decimals (never
floating-point), an inventory ledger that records every stock movement, idempotent billing (a retried
sale never double-charges), and a hardened web client with strong security headers.

**AI capabilities.** A **safe** natural-language assistant. The AI model is **only allowed to pick one of
five fixed, read-only reports** (expiring-soon, low-stock, top-selling, dead-stock, sales-summary) — it
**never writes or runs raw database queries**. Every question is scoped to the asker's own pharmacy and
logged for audit. Powered by Google Gemini (`gemini-2.5-flash`); if no API key is configured the AI
endpoints return a clean "unavailable" instead of crashing. (Verified: `apps/api/src/modules/ai/service.ts`,
`apps/api/src/lib/ai/gemini-provider.ts`.)

**Authentication model.** Email + password. After login the app holds a short-lived "access token" in
memory (15 minutes) and a long-lived "refresh token" in a secure browser cookie (30 days) to keep you
signed in. Passwords are hashed with bcrypt. (Verified: `auth/service.ts`, `utils/jwt.ts`, `utils/password.ts`.)

**Multi-tenant behavior.** Every pharmacy is a "tenant." Each tenant's data carries a `shop_id`, and the
server scopes every query to the `shop_id` taken from the logged-in user's token — **never** from anything
the browser sends. An optional database-level guard (PostgreSQL Row-Level Security) is provided as a second
line of defense. (Verified: `schema.prisma`, `apps/api/prisma/rls.sql`, repository code.)

**Overall architecture (one sentence).** Three independent pieces — a **Next.js web app**, an
**Express/TypeScript API**, and a **PostgreSQL database** — that you can host separately and wire together
with environment variables; no code changes are needed to deploy.

---

## SECTION 2 — COMPLETE FOLDER STRUCTURE ANALYSIS

This is a **monorepo with no build orchestration**: the root `package.json` has **no `workspaces`, no
scripts, and no Docker/Turbo** (verified — it contains only stray `@types/*` dependencies). The two apps
are installed and built **independently**. **Consequence for deployment:** your host must point its "root
directory" at `apps/web` (frontend) or `apps/api` (backend) — never at the repo root.

### Important folders

| Path | Purpose | Runtime responsibility | Deployment relevance |
|---|---|---|---|
| **`/` (root)** | Monorepo container + top-level docs. | None (not a deployable unit). | Root `package.json` is **not** a workspace root. Hosts must target a subfolder. `render.yaml` lives here. |
| **`apps/web/`** | The **frontend** — Next.js 15 App Router, React 19, TypeScript, Tailwind. | Renders the UI in the browser; calls the API; (optionally) proxies `/api/*` to the API server-side. | **Deploy target = Vercel** (root dir `apps/web`). Build `next build`, start `next start`. |
| `apps/web/src/app/` | App Router routes, split into `(auth)` (login/register) and `(app)` (everything behind login). | Server+client React route rendering. | `(app)/layout.tsx` wraps all private routes in `AuthGuard`. |
| `apps/web/src/features/` | Feature modules (dashboard, billing/pos, medicines, batches, dealers, analytics, ai, admin, subscriptions, settings, auth). | Client UI + TanStack Query hooks. | — |
| `apps/web/src/services/` | Typed Axios API layer (`api/client.ts` interceptors, `api/http.ts`, per-domain `*.service.ts`). | All browser→API HTTP. | `api/client.ts` holds the **silent-refresh** logic (Blocker 2). |
| `apps/web/src/lib/`, `components/`, `providers/`, `hooks/` | Env access, formatting, UI primitives (Radix), React Query/Auth providers. | — | `lib/env.ts` reads `NEXT_PUBLIC_API_URL`. |
| `apps/web/next.config.mjs` | Next config: **security headers (CSP/HSTS/…)** + **`/api/*` reverse proxy**. | Emits headers; rewrites `/api/*`→API at the server. | **Load-bearing for auth** (proxy) and security. |
| `apps/web/scripts/capture-screenshots.mjs` | Dev tooling to capture UI screenshots. | None. | Not deployed. |
| **`apps/api/`** | The **backend** — Express + TypeScript + Prisma. Compiled with `tsc` → `dist/`. | Serves `/api/v1/*` + `/health`; talks to PostgreSQL + Gemini. | **Deploy target = Render/Railway** (root dir `apps/api`). Build `tsc`, start `node dist/server.js`. |
| `apps/api/src/modules/` | One folder per domain (`auth`, `shops`, `admin`, `dealers`, `medicines`, `batches`, `billing`, `analytics`, `ai`, `subscriptions`), each `routes→controller→service→repository→validators→types`. | Business logic + data access. | The **modular monolith**: one process, clean internal layering. |
| `apps/api/src/middleware/` | Cross-cutting: `authenticate`, `authorize`, `requireApprovedShop`, `validate`, `rateLimit`, `errorHandler`, `requestId`, `requestLogger`, `notFound`. | Per-request pipeline. | Security/RBAC/CORS behavior lives here + in `app.ts`. |
| `apps/api/src/config/` | `env.ts` (**fail-fast Zod env validation**) + `constants.ts`. | Boots config; refuses to start if env invalid. | **The deployment contract.** Read it before setting env vars. |
| `apps/api/src/lib/` | `prisma.ts` (DB client singleton), `logger.ts` (Pino), `ai/` (provider abstraction + Gemini). | DB + logging + AI clients. | — |
| `apps/api/src/utils/` | `money.ts` (Decimal contract), `jwt.ts`, `password.ts`, `AppError.ts`, `asyncHandler.ts`, pagination, etc. | Shared helpers. | `money.ts` `install()` is called at boot (`app.ts`). |
| **`apps/api/prisma/`** | `schema.prisma`, `migrations/`, `rls.sql`, `seed.ts` + `seed/`. | Schema + migrations + demo data. | **The whole database setup.** `migrate deploy` here. Blocker 1 lives at `schema.prisma:24`. |
| `apps/api/prisma/migrations/` | `20260602120000_init/` + `20260603120000_contracts/` (+ `migration_lock.toml`). | The two SQL migrations applied to prod. | Apply with `prisma migrate deploy`. Adds CHECK constraints, `updated_at` trigger, FKs beyond what Prisma models express. |
| `apps/api/prisma/rls.sql` | **Optional** Row-Level Security (not run by migrations). | DB-enforced tenant isolation. | Manual `psql -f` step; defense-in-depth. |
| `apps/api/scripts/` | `seed-verify.ts`, `seed-today-check.ts`, `ai-smoke.ts`. | Dev/verification scripts. | Not deployed. |
| `apps/api/tests/` | Vitest integration suite on **real PostgreSQL 16** via Testcontainers (FEFO, money, concurrency, idempotency, returns/voids, tenant isolation). | Test only. | Run in CI (`api-tests` job). Affected by Blocker 1. |
| **`.github/workflows/`** | `ci.yml` (quality gate, **not a deployer**) + `keep-warm.yml` (pings `/health`). | CI on push/PR. | CI does **not** deploy; Vercel/Render auto-deploy on push. |
| **`docs/`** | `ARCHITECTURE.md`, `DEPLOYMENT.md`, `DEPLOY_FREE.md`, `ENVIRONMENT.md`, `OPERATIONS.md`, `OBSERVABILITY.md`, `screenshots/`. | Human docs. | Useful but partly stale re: `directUrl` (see Blocker 1). |
| **Root docs** | `README.md`, `ARCHITECTURE.md`, `DEPLOY_STOCKEASY.md`, `PRODUCTION_READINESS.md`, `FINAL_LAUNCH_READINESS.md`, `LICENSE`. | Reference. | `DEPLOY_STOCKEASY.md` is the prior master guide (good, but see Blocker 1). |
| `render.yaml` | Render Blueprint for the API. | Defines the Render web service. | **Build command will fail at `db:migrate` until `DIRECT_URL` is set** (Blocker 1). |

### Visual folder tree (important files only)

```text
stock-easy/
├─ package.json                      # ⚠️ NOT a workspace root (no scripts/workspaces)
├─ render.yaml                       # Render Blueprint for apps/api (build runs db:migrate)
├─ README.md  ARCHITECTURE.md  DEPLOY_STOCKEASY.md
├─ PRODUCTION_READINESS.md  FINAL_LAUNCH_READINESS.md  LICENSE
├─ .gitignore                        # ignores node_modules, .next, dist, ALL .env*
├─ .github/workflows/
│  ├─ ci.yml                         # web + api-quality + api-tests (quality gate only)
│  └─ keep-warm.yml                  # cron pings API /health (backup keep-warm)
├─ docs/
│  ├─ DEPLOYMENT.md  DEPLOY_FREE.md  ENVIRONMENT.md
│  ├─ OPERATIONS.md  OBSERVABILITY.md  ARCHITECTURE.md
│  └─ screenshots/
├─ apps/
│  ├─ api/                           # ── BACKEND (Express + TS + Prisma) ──
│  │  ├─ package.json                # scripts: build(tsc) start(node dist) db:migrate seed test
│  │  ├─ tsconfig.json               # target ES2022, module CommonJS, out dist/
│  │  ├─ .env.example                # ⚠️ missing DIRECT_URL
│  │  ├─ render?  (none)             # config via render.yaml at root
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma            # 🔴 line 24: directUrl = env("DIRECT_URL")
│  │  │  ├─ migrations/
│  │  │  │  ├─ 20260602120000_init/migration.sql
│  │  │  │  └─ 20260603120000_contracts/migration.sql
│  │  │  ├─ rls.sql                  # OPTIONAL row-level security (manual)
│  │  │  ├─ seed.ts  seed/           # demo dataset (8 shops…)
│  │  ├─ src/
│  │  │  ├─ server.ts                # bootstrap: prisma.$connect + listen(env.PORT) + graceful shutdown
│  │  │  ├─ app.ts                   # express wiring: helmet, cors, json, /health, /api/v1, rate limit
│  │  │  ├─ config/env.ts            # 🔑 fail-fast Zod env validation (the deployment contract)
│  │  │  ├─ config/constants.ts      # API_PREFIX=/api/v1, REFRESH_COOKIE=se_refresh, TTLs
│  │  │  ├─ middleware/              # authenticate, authorize, requireApprovedShop, rateLimit, errorHandler…
│  │  │  ├─ modules/<domain>/        # routes→controller→service→repository→validators→types
│  │  │  ├─ lib/  utils/             # prisma, logger, ai/*, money.ts, jwt.ts, password.ts
│  │  └─ tests/                      # Vitest + Testcontainers (PostgreSQL 16)
│  └─ web/                           # ── FRONTEND (Next.js 15 + React 19) ──
│     ├─ package.json                # scripts: dev build start lint typecheck
│     ├─ next.config.mjs             # 🔑 security headers + /api/* proxy (rewrites)
│     ├─ tailwind.config.ts  postcss.config.mjs  tsconfig.json
│     ├─ .env.example  .env.local    # NEXT_PUBLIC_API_URL
│     └─ src/
│        ├─ app/(auth)/…  app/(app)/…   # route groups; (app)/layout.tsx = AuthGuard + AppShell
│        ├─ features/<domain>/          # dashboard, billing/pos, medicines, analytics, ai, admin…
│        ├─ services/api/{client,http,token-store,errors}.ts   # 🔑 axios + silent refresh
│        ├─ providers/{auth-provider,query-provider}.tsx
│        ├─ components/{ui,shared,layout,guards}/
│        └─ lib/{env,format,money,nav-config}.ts
```

---

## SECTION 3 — APPLICATION ARCHITECTURE

Stock Easy is a **modular monolith API** (`routes → controller → service → repository → Prisma`, with
cross-cutting concerns in middleware) plus a **Next.js App-Router client** that uses a typed Axios layer +
TanStack Query. Diagrams below are reconstructed from the source files cited.

### 3.1 System architecture

```mermaid
flowchart LR
  subgraph Users
    A["Central Admin"]
    O["Shop Owner"]
    S["Shop Staff"]
  end
  Users -->|HTTPS| WEB["Next.js 15 web client<br/>apps/web (Vercel)"]
  WEB -->|"/api/* proxy (server-side rewrite)<br/>next.config.mjs"| WEB
  WEB -->|"REST /api/v1 · Bearer access token<br/>+ httpOnly refresh cookie (credentialed)"| API["Express API · modular monolith<br/>apps/api (Render/Railway)"]
  API -->|"Prisma 6 · tenant-scoped by shop_id"| DB[("PostgreSQL<br/>Neon/Supabase · RLS optional")]
  API -->|"tool-calling over 5 safe reports"| AI["Google Gemini<br/>gemini-2.5-flash"]
```

**Explanation.** The browser ideally talks only to the web origin; `next.config.mjs` forwards `/api/*`
to the API server-side (keeping the refresh cookie first-party — Blocker 2). The API verifies a JWT
access token on every protected route, scopes all data by the `shop_id` inside that token, and persists
via Prisma. AI questions are answered by letting Gemini choose one of five fixed analytics reports.

### 3.2 Frontend architecture

```mermaid
flowchart TD
  RootLayout["app/layout.tsx → Providers"] --> QP["QueryProvider (TanStack Query)"]
  RootLayout --> AP["AuthProvider (in-memory access token + bootstrap refresh)"]
  AP --> Groups{Route group}
  Groups -->|"(auth)"| AuthRoutes["/login /register<br/>GuestGuard"]
  Groups -->|"(app)"| AppLayout["(app)/layout.tsx<br/>AuthGuard → AppShell"]
  AppLayout --> Features["features/* views"]
  Features --> Hooks["TanStack Query hooks"]
  Hooks --> Services["services/*.service.ts"]
  Services --> HTTP["services/api/http.ts"]
  HTTP --> Client["services/api/client.ts<br/>axios: attach Bearer, 401→silent refresh"]
  Client -->|"withCredentials"| API[("/api/v1")]
```

**Explanation.** `AuthProvider` (`providers/auth-provider.tsx`) holds the access token in memory only
(XSS hardening — `token-store.ts`), and on first mount calls `/auth/refresh` to restore the session from
the cookie. `(app)/layout.tsx` gates every private page behind `AuthGuard`; `RoleGuard`/`nav-config.ts`
hide owner/admin-only areas. A single Axios instance attaches the Bearer token and transparently retries
once on a 401 after refreshing.

### 3.3 Backend architecture

```mermaid
flowchart TD
  Req["HTTP request"] --> RID["requestId"] --> RLog["requestLogger"]
  RLog --> Helmet["helmet (security headers)"] --> Cors["cors (allowlist + credentials)"]
  Cors --> Json["express.json (1mb) + cookieParser"]
  Json --> Health{"/health?"}
  Health -->|yes| OK["200 {status:ok} (no DB)"]
  Health -->|no| Limit["generalLimiter (300/15m)"]
  Limit --> Router["/api/v1 router"]
  Router --> MW["authenticate → authorize → requireApprovedShop → validate(zod)"]
  MW --> Ctrl["controller"] --> Svc["service (business logic, $transaction)"]
  Svc --> Repo["repository (Prisma + raw SQL: FOR UPDATE, advisory lock)"]
  Repo --> Prisma[("PostgreSQL")]
  MW -.error.-> EH["errorHandler → {success:false,error:{code,message}}"]
```

**Explanation.** `app.ts` wires the pipeline in this exact order. Each module's `routes.ts` declares its
own auth/role/approval/validation guards (e.g. `billing/routes.ts`, `admin/routes.ts`). Services own
transactions; repositories own data access including raw SQL where row-level locking is needed.

### 3.4 Database architecture

```mermaid
flowchart LR
  subgraph Global["Global (not tenant-scoped)"]
    SP["subscription_plans"]
    ADMIN["users (central_admin: shop_id NULL)"]
  end
  subgraph Tenant["Per-tenant (scoped by shop_id)"]
    SHOP["shops (THE TENANT)"]
    U["users (members)"]
    D["dealers"]
    M["medicines"]
    B["batches (drive FEFO)"]
    BILL["bills + bill_items"]
    SM["stock_movements (ledger)"]
    R["bill_returns + items"]
    IK["idempotency_keys"]
    AIL["ai_query_logs"]
  end
  SHOP --> U & D & M & B & BILL & SM & R & IK & AIL
  SP -. plan .-> SHOP
```

**Explanation.** `shops` is the tenant root; every tenant table carries an indexed `shop_id` FK that
cascades on shop delete. `subscription_plans` and the `central_admin` user are global. Details and the
full ER diagram are in [Section 4](#section-4--database-analysis).

### 3.5 Authentication flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as Web (Next proxy)
  participant API as Express API
  participant DB as PostgreSQL
  B->>API: POST /auth/login {email,password}
  API->>DB: find user; bcrypt.compare (dummy hash if absent → constant time)
  API-->>B: 200 {accessToken} + Set-Cookie se_refresh (httpOnly, Strict, /api/v1/auth)
  Note over B: accessToken kept in memory only (15 min)
  B->>API: GET /api/v1/... (Authorization: Bearer access)
  API-->>B: 200 data
  Note over B: access expired → 401
  B->>API: POST /auth/refresh (empty body; cookie carries refresh)
  API->>DB: lookup token hash; rotate family; reuse-detection
  API-->>B: 200 {accessToken} + new se_refresh
```

**Explanation.** Verified in `auth/service.ts`, `auth/controller.ts`, `utils/jwt.ts`. Refresh tokens are
opaque 48-byte secrets; only their SHA-256 hash is stored. Rotation uses a `family_id`; presenting a
revoked/raced token revokes the whole family (theft defense). **The empty-body refresh is why Blocker 2
matters.**

### 3.6 Authorization (RBAC) flow

```mermaid
flowchart TD
  T["JWT access token: {sub, role, shopId}"] --> Auth["authenticate → req.auth"]
  Auth --> Role{"authorize(...roles)"}
  Role -->|role not allowed| F403["403 Forbidden"]
  Role -->|allowed| Approved{"requireApprovedShop?"}
  Approved -->|"shop.status != approved (read from DB)"| F403b["403 — selling disabled"]
  Approved -->|approved / not required| Scope["service uses req.auth.shopId<br/>(never client-supplied)"]
  Scope --> Data["tenant-scoped query"]
```

**Explanation.** `authorize()` checks the role claim; `requireApprovedShop` reads **live** `shop.status`
from the DB so a revocation takes effect immediately (`middleware/requireApprovedShop.ts`). Selling/AI
routes require an approved shop; admin routes require `central_admin`.

### 3.7 Multi-tenant architecture

```mermaid
flowchart TD
  JWT["shopId from JWT"] --> SVC["service/repository"]
  SVC --> Q["WHERE shop_id = $shopId (app layer)"]
  Q --> PG[("PostgreSQL")]
  subgraph Optional["Optional defense-in-depth (rls.sql, manual)"]
    SET["SET app.current_shop_id = shopId (set_config)"]
    POL["RLS policy: shop_id = current_shop_id()"]
  end
  SVC -. in billing tx .-> SET
  SET --> POL --> PG
```

**Explanation.** Primary isolation is application-layer `shop_id` filtering using the token's shopId.
Billing transactions also call `setTenant` (`set_config('app.current_shop_id', …)`,
`billing/repository.ts:14`), so if you apply `rls.sql` the database itself enforces isolation. RLS is
**opt-in** (not part of migrations).

### 3.8 FEFO sale workflow

```mermaid
sequenceDiagram
  participant API
  participant DB as PostgreSQL
  API->>DB: BEGIN tx (timeout 15s)
  API->>DB: set_config(app.current_shop_id, shopId)
  API->>DB: pg_advisory_xact_lock(hash(shopId))  %% serialize per shop
  API->>DB: idempotency check (key + request hash)
  loop per medicine
    API->>DB: SELECT batches WHERE qty>0 AND expiry>=today ORDER BY expiry ASC, created_at ASC FOR UPDATE
    API->>API: allocateFefo(batches, qty) — spill across batches
    API->>DB: UPDATE batches SET qty = qty - n WHERE qty >= n (guarded)
  end
  API->>DB: INSERT bill + bill_items (Decimal money, GST)
  API->>DB: INSERT stock_movements (one negative per batch)
  API->>DB: mark idempotency completed
  API->>DB: COMMIT (all-or-nothing)
```

**Explanation.** Verified in `billing/service.ts` + `billing/repository.ts` + `batches/fefo.ts`. A
per-shop **advisory transaction lock** serializes concurrent sales for that shop; `SELECT … FOR UPDATE`
plus a guarded decrement prevent overselling under races; the whole thing is one transaction so a failure
rolls back cleanly. **Voids** restock un-returned quantities; **returns** restock exact batches and refund.
Money uses the `Decimal` contract (`utils/money.ts`) — ROUND_HALF_UP @ 2dp, GST tax-exclusive, serialized
as 2-decimal strings.

### 3.9 Analytics workflow

```mermaid
flowchart LR
  UI["analytics-view / dashboard hooks"] --> AReq["GET /api/v1/analytics/*"]
  AReq --> ASvc["analytics/service.ts"]
  ASvc --> ARepo["analytics/repository.ts (aggregations, shop-scoped)"]
  ARepo --> PG[("PostgreSQL")]
  ASvc --> UI
```

**Explanation.** Analytics endpoints power the dashboard and the analytics page (revenue, top medicines,
expiring-soon, dead-stock, low-stock, valuation). The same service methods are reused by the AI tools
(below), so AI answers and dashboards share one trusted code path. (`modules/analytics/*`, called from
`ai/service.ts`.)

### 3.10 AI assistant workflow

```mermaid
sequenceDiagram
  participant B as Browser
  participant API
  participant G as Gemini
  participant AN as analytics service
  B->>API: POST /ai/query {question} (auth + approved shop + aiLimiter 60/15m)
  API->>G: chooseTool(system, question, 5 tool defs)  temp=0, 25s timeout
  alt model declines / unknown tool
    API-->>B: answer text, no data; log status=blocked
  else model picks a tool
    API->>API: zod-validate & clamp tool args
    API->>AN: run the chosen report (scoped to shopId)
    API->>G: summarizeToolResult(rows)
    G-->>API: short natural-language summary
    API-->>B: {answer, tool, arguments, data}; log status=success
  end
```

**Explanation.** Verified in `ai/service.ts` + `lib/ai/gemini-provider.ts`. The model can **only** select
from `expiring_soon`, `low_stock`, `top_selling`, `dead_stock`, `sales_summary`. **No raw SQL ever
reaches the database.** Every call is shop-scoped, rate-limited, time-boxed (25s), and audited in
`ai_query_logs`. Missing `GEMINI_API_KEY` → clean `503`.

### 3.11 Request lifecycle (end to end)

```mermaid
flowchart LR
  U["User action"] --> RQ["TanStack Query hook"]
  RQ --> SV["service.ts"] --> AX["axios client (Bearer + withCredentials)"]
  AX -->|"/api/v1 (direct or via Next proxy)"| MW["API middleware chain"]
  MW --> H["controller → service → repository"]
  H --> DB[("PostgreSQL")]
  H --> RESP["{success,data,meta} envelope"]
  RESP --> AX2["axios unwraps data; 401→refresh+retry"]
  AX2 --> CACHE["React Query cache → UI re-render"]
```

**Explanation.** All responses use a uniform envelope (`utils/httpResponse.ts`), unwrapped once in
`services/api/http.ts`. Errors become typed `ApiError`s surfaced as toasts.

### 3.12 Deployment architecture (recommended)

```mermaid
flowchart LR
  Dev["git push → main"] --> GH["GitHub"]
  GH -->|auto-deploy| V["Vercel (apps/web)<br/>NEXT_PUBLIC_API_URL=/api/v1<br/>API_PROXY_TARGET=api origin"]
  GH -->|auto-deploy| R["Render/Railway (apps/api)<br/>build: tsc · start: node dist/server.js<br/>migrate: prisma migrate deploy"]
  GH -->|CI gate| CI["ci.yml: web + api-quality + api-tests"]
  Browser --> V
  V -->|server-side /api/* proxy| R
  R -->|"DATABASE_URL + DIRECT_URL (sslmode=require)"| N[("Neon/Supabase PostgreSQL")]
  R -->|GEMINI_API_KEY| Gem["Google Gemini"]
  Keep["UptimeRobot / keep-warm.yml"] -->|/health every 5m| R
```

**Explanation.** Detailed in [Section 8](#section-8--recommended-deployment-plan). CI is a **gate, not a
deployer**; Vercel and Render/Railway each watch GitHub and deploy on push to `main`.

---

## SECTION 4 — DATABASE ANALYSIS

| Aspect | Finding | Evidence |
|---|---|---|
| **Engine** | PostgreSQL (14+; tested on **16**). Requires `pgcrypto` (`gen_random_uuid()`). | `migrations/…_init/migration.sql:3,15`; `schema.prisma` |
| **ORM** | Prisma **6.19.3** (`@prisma/client` + `prisma`). Pin to **6.x** (Prisma 7 drops `url`). | `apps/api/package.json`; `docs/OPERATIONS.md` |
| **Datasource** | `url = env("DATABASE_URL")` **and** `directUrl = env("DIRECT_URL")`. ⚠️ See **Blocker 1**. | `schema.prisma:21-25` |
| **Migration strategy** | Versioned SQL in `prisma/migrations/`; apply with **`prisma migrate deploy`** (idempotent). Two migrations: `init` + `contracts`. | `migrations/`; `package.json` `db:migrate` |
| **Schema↔SQL split** | SQL migrations add objects Prisma can't model: **CHECK constraints**, an **`updated_at` BEFORE trigger**, FK delete rules, and an **optional partial FEFO index** (commented out). | `…_init/migration.sql:283-338` |
| **Seed strategy** | `prisma db seed` → `tsx prisma/seed.ts` → demo dataset (**8 shops, 19 users, 304 meds, 550 batches, 930 bills**). **Refuses** to run with `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true`. Preserves the existing central_admin + plan catalogue. | `prisma/seed/index.ts:138-141`; `package.json` |
| **Multi-tenancy** | App-layer `shop_id` filtering using the JWT's shopId; **optional** PostgreSQL RLS (`rls.sql`) as defense-in-depth. | repositories; `rls.sql`; `billing/repository.ts:14` |
| **Data ownership** | `shops` = tenant root. Deleting a shop **cascades** all its tenant rows. `central_admin` users have `shop_id = NULL`. `subscription_plans` are global. | `schema.prisma` FK `onDelete` rules |

### Tables (14)

`subscription_plans`, `users`, `shops`, `dealers`, `medicines`, `batches`, `bills`, `bill_items`,
`ai_query_logs`, `refresh_tokens`, `stock_movements`, `bill_returns`, `bill_return_items`,
`idempotency_keys`. All PKs are `UUID DEFAULT gen_random_uuid()`; money is `DECIMAL(12,2)`; timestamps are
`TIMESTAMPTZ(6)`.

**Notable constraints / indexes (verified in the SQL migrations):**
- `users.email` unique (lowercased in app layer); indexed on `shop_id`, `role`.
- `shops`: unique `owner_user_id`, unique `license_number`; indexed on `status`, `subscription_status`, `plan_id`, `verified_by`.
- `dealers`: unique `(shop_id, name)`. `medicines`: unique `(shop_id, name, strength, form)`.
- `batches`: unique `(shop_id, medicine_id, batch_number)`; FEFO index `(shop_id, medicine_id, expiry_date)`; CHECKs: `received>0`, `remaining>=0`, `remaining<=received`, `cost_price>=0`, `mrp>=0`.
- `bills`: unique `(shop_id, bill_number)` (per-shop sequence); indexed `(shop_id, created_at)`, `(shop_id, status)`. CHECK on non-negative amounts and `gst_rate 0..100`.
- `bill_items`: CHECK `quantity>0`, `returned_quantity 0..quantity`. `stock_movements`: CHECK `change<>0`.
- `idempotency_keys`: unique `(shop_id, key)`.
- `refresh_tokens`: unique `token_hash`; indexed `user_id`, `family_id`, `expires_at`.

### ER diagram

```mermaid
erDiagram
  subscription_plans ||--o{ shops : "plan_id (SET NULL)"
  users ||--|| shops : "owner_user_id (unique, NO ACTION)"
  users ||--o{ shops : "verified_by (SET NULL)"
  shops ||--o{ users : "members shop_id (CASCADE)"
  shops ||--o{ dealers : "CASCADE"
  shops ||--o{ medicines : "CASCADE"
  shops ||--o{ batches : "CASCADE"
  shops ||--o{ bills : "CASCADE"
  shops ||--o{ ai_query_logs : "CASCADE"
  users ||--o{ refresh_tokens : "CASCADE"
  medicines ||--o{ batches : "NO ACTION"
  dealers ||--o{ batches : "SET NULL"
  bills ||--o{ bill_items : "CASCADE"
  batches ||--o{ bill_items : "NO ACTION"
  medicines ||--o{ bill_items : "NO ACTION"
  bills ||--o{ bill_returns : "CASCADE"
  bill_returns ||--o{ bill_return_items : "CASCADE"
  bill_items ||--o{ bill_return_items : "NO ACTION"
  batches ||--o{ stock_movements : "NO ACTION"
  bills ||--o{ stock_movements : "SET NULL"
  shops ||--o{ stock_movements : "CASCADE"
  shops ||--o{ idempotency_keys : "CASCADE"
  bills ||--o{ idempotency_keys : "SET NULL"

  shops {
    uuid id PK
    uuid owner_user_id "unique"
    text license_number "unique"
    shop_status status "pending|approved|rejected"
    subscription_status subscription_status
    uuid plan_id FK
  }
  users {
    uuid id PK
    uuid shop_id FK "NULL for central_admin"
    text email "unique"
    user_role role
  }
  batches {
    uuid id PK
    uuid shop_id FK
    uuid medicine_id FK
    date expiry_date
    int quantity_remaining
    decimal mrp
  }
  bills {
    uuid id PK
    uuid shop_id FK
    int bill_number "per-shop seq"
    bill_status status
    decimal total
  }
```

### How production migrations should be executed

1. **Provision** a managed PostgreSQL; get its connection string with TLS (`?sslmode=require`).
2. **Set BOTH** `DATABASE_URL` **and** `DIRECT_URL` (Blocker 1) wherever migrations run.
3. **Apply** from `apps/api`: `npm run db:migrate` (= `prisma migrate deploy`) — idempotent; applies only
   pending migrations, **before** new code serves traffic.
4. **Verify:** `npx prisma migrate status` → no pending. (Will itself fail without `DIRECT_URL`.)
5. **(Optional, recommended)** apply `prisma/rls.sql` via `psql` and run the API under a non-superuser
   role for DB-enforced tenant isolation.
6. **Seed only a demo DB** (`npm run db:seed`). **Never** seed a real customer database.
7. **Rollback** = roll **forward** with a new migration; for data loss, restore from PITR/backup. Never
   hand-edit an applied migration.

> ⚠️ `render.yaml` runs `db:migrate` inside the **build** command. That works for a single instance, but
> it (a) fails today without `DIRECT_URL`, and (b) is better moved to a release/pre-deploy phase if your
> host supports one. See [Risk D3](#d3).

---

## SECTION 5 — AUTHENTICATION AND SECURITY ANALYSIS

All items verified from source.

### JWT / token strategy
- **Access token:** JWT signed with `JWT_ACCESS_SECRET`, payload `{sub, role, shopId}`, TTL
  `ACCESS_TOKEN_TTL_SECONDS` (default **900s / 15 min**). Sent as `Authorization: Bearer`. Stored
  **in browser memory only** (never localStorage) — `services/api/token-store.ts`. (`utils/jwt.ts:12-16`)
- **Refresh token:** an **opaque** 48-byte random hex string (not a JWT). Only its **SHA-256 hash** is
  stored in `refresh_tokens`. TTL `REFRESH_TOKEN_TTL_DAYS` (default **30 days**). **Rotating** with a
  `family_id` and **reuse detection**: presenting a revoked or raced token revokes the entire family.
  (`utils/jwt.ts:32-43`, `auth/service.ts:85-117`)
- **`JWT_REFRESH_SECRET`** is validated/required by env but the refresh token itself is opaque + hashed;
  the secret must still be present (≥16 chars) for the process to boot.

### Cookie settings (the decisive deployment fact)
`auth/controller.ts:15-23` sets the refresh cookie:
```ts
res.cookie('se_refresh', token, {
  httpOnly: true,
  secure: isProd,            // Secure only when NODE_ENV=production
  sameSite: 'strict',        // ← cross-site requests will NOT send it
  maxAge: REFRESH_TOKEN_TTL_DAYS * 86400_000,
  path: '/api/v1/auth',      // cookie only sent to /api/v1/auth/*
});
```
- **`SameSite=Strict` + empty-body refresh** → the web client (`services/api/client.ts:36-45`) depends on
  the browser auto-sending this cookie, which only happens **same-site**. **This dictates the whole
  deployment topology** (Blocker 2 / [Risk A1](#a1)).
- **`secure: isProd`** → in production the cookie is HTTPS-only. Therefore **`NODE_ENV=production` is
  mandatory in prod**, and everything must be HTTPS.
- **`path: '/api/v1/auth'`** → matches the refresh/logout calls; if you ever change `API_PREFIX`
  (`constants.ts:3`), update this too.

### Session handling
- No server session store beyond `refresh_tokens` rows. Logout revokes the presented refresh token and
  clears the cookie (`auth/controller.ts:54-58`). Sessions are otherwise **stateless JWTs** → the API
  scales horizontally with **no sticky sessions**.

### RBAC / permission model
- Three roles (`central_admin`, `shop_owner`, `shop_staff`). Enforced by `authenticate` (verifies token →
  `req.auth`) then `authorize(...roles)` (`middleware/authorize.ts`). Examples:
  - `admin/routes.ts`: entire router is `central_admin`-only.
  - `billing/routes.ts`: `shop_owner`+`shop_staff`; **voids are owner-only**; selling/returns require
    `requireApprovedShop`.
  - `ai/routes.ts`: owner+staff, approved shop, `aiLimiter`; `/ai/logs` owner-only.
  - `auth/routes.ts`: `POST /auth/staff` is owner-only.
- **Tenant scoping** uses `req.auth.shopId` from the token — **client-supplied `shop_id` is never
  trusted** (confirmed across repositories).
- `requireApprovedShop` reads **live** `shop.status` from the DB (not the token) so approval revocation is
  immediate (`middleware/requireApprovedShop.ts`).

### CORS requirements
- `app.ts:41-46`: `cors({ origin: env.CORS_ORIGIN.split(','), credentials: true })`.
- `config/env.ts:23-28`: `CORS_ORIGIN` is **required**, comma-separated, and **rejects `"*"`** (a wildcard
  with credentials is unsafe). **It must list the exact web origin(s)** the browser uses. With the Next
  proxy, the browser origin is the **web** origin; CORS still must allow it for any direct calls.

### Security headers (web)
`next.config.mjs:40-55` emits on every route: **CSP** (with `connect-src` derived from
`NEXT_PUBLIC_API_URL`), **HSTS** (2 years, preload), `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, **COOP** `same-origin`, **CORP**
`same-origin`; `X-Powered-By` disabled. API also uses **`helmet()`** (`app.ts:39`).

### Rate limiting (API)
`middleware/rateLimit.ts`: general **300 / 15 min**, auth (`/login /register /refresh`) **20 / 15 min**,
AI **60 / 15 min**. `app.set('trust proxy', 1)` (`app.ts:32`) so client IPs are correct behind a proxy.

### Password security
- bcrypt via `bcryptjs`, cost `BCRYPT_ROUNDS` (default **12**, range 8–15). Constant-time login: a **dummy
  hash** is compared when the email is unknown, closing the user-enumeration timing channel
  (`utils/password.ts`).

### Environment validation & secret management
- `config/env.ts` is a **fail-fast Zod schema**: the process **exits(1)** on any invalid/missing var.
  Enforces `JWT_*` ≥ 16 chars and the `CORS_ORIGIN` no-wildcard rule. **`DIRECT_URL` is NOT in this
  schema** — Prisma reads it directly, which is exactly why Blocker 1 is silent at the app layer but fatal
  at the Prisma layer.
- Secrets live only in host env / secret stores; all `.env*` are gitignored (`.gitignore`).
- ⚠️ **A real-looking Gemini key currently sits in `apps/api/.env:11`** (a gitignored dev file). **Rotate
  it** before sharing the repo or deploying; set the new key only in the host secret store.

### Deployment implications — what MUST remain unchanged for auth to work
1. **`NODE_ENV=production`** in prod (or the cookie isn't `Secure` and browsers may reject it over HTTPS).
2. **Web and API must be effectively same-site** — either via the **Next `/api/*` proxy**
   (`API_PROXY_TARGET` + `NEXT_PUBLIC_API_URL=/api/v1`) **or** a shared custom domain
   (`app.x.com`+`api.x.com`). Otherwise refresh/reload break.
3. **`CORS_ORIGIN`** must exactly equal the browser origin (scheme+host, no trailing slash, no `*`).
4. **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`** ≥ 16 chars, distinct, stable (rotating them logs
   everyone out — expected).
5. The cookie **name/path/sameSite** and the **empty-body refresh** are a matched pair — don't change one
   without the other.

---

## SECTION 6 — ENVIRONMENT VARIABLES

Discovered by reading `config/env.ts`, `apps/api/.env.example`, `apps/api/.env`, `apps/web/.env.example`,
`apps/web/src/lib/env.ts`, `next.config.mjs`, `render.yaml`, and the seed. "Target" = where you set it.

### API (`apps/api`) — backend, set on Render/Railway

| Variable | Required? | Purpose | Default | Side | Secret? | Deployment target |
|---|---|---|---|---|---|---|
| `NODE_ENV` | **Yes (prod)** | Enables prod behavior incl. **Secure** cookies. | `development` | Backend | No | Render/Railway |
| `PORT` | No | API listen port. | `4000` | Backend | No | Host injects it (read by `env.PORT`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection (Prisma runtime + migrations). | — | Backend | **Yes** | Render/Railway (+ local) |
| **`DIRECT_URL`** | **Yes (de-facto)** | **Required by the schema's `directUrl` for all Prisma CLI cmds.** Set = direct (non-pooled) string. ✅ now in `.env.example` + `render.yaml`; **not** enforced in `env.ts` (by design). | — | Backend | **Yes** | Render/Railway build + CI + local |
| `JWT_ACCESS_SECRET` | **Yes** | Signs access tokens. **≥16 chars.** | — | Backend | **Yes** | Render/Railway (`render.yaml` auto-generates) |
| `JWT_REFRESH_SECRET` | **Yes** | Signs/guards refresh flow. **≥16 chars, distinct.** | — | Backend | **Yes** | Render/Railway (auto-generated) |
| `ACCESS_TOKEN_TTL_SECONDS` | No | Access-token lifetime. | `900` | Backend | No | Optional |
| `REFRESH_TOKEN_TTL_DAYS` | No | Refresh lifetime + cookie maxAge. | `30` | Backend | No | Optional |
| `BCRYPT_ROUNDS` | No | Password hash cost (8–15). | `12` | Backend | No | Optional |
| `CORS_ORIGIN` | **Yes** | Credentialed-request allowlist. **No `*`.** Must equal web origin. | — | Backend | No | Render/Railway |
| `LOG_LEVEL` | No | Pino level. | `info` | Backend | No | Optional |
| `GEMINI_API_KEY` | No* | AI assistant. *`/ai` → 503 until set. | — | Backend | **Yes** | Render/Railway |
| `AI_PROVIDER` | No | Provider switch (only `gemini`). | `gemini` | Backend | No | Optional |
| `AI_MODEL` | No | Model id. | `gemini-2.5-flash` | Backend | No | Optional |
| `SEED_PASSWORD`, `SEED_RNG`, `SEED_EMAIL_DOMAIN`, `SEED_HISTORY_DAYS`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ALLOW_PRODUCTION` | No | Seed tunables; `SEED_ALLOW_PRODUCTION=true` overrides the prod-seed guard. | see seed | Backend | mixed | Local/seed only |
| `TEST_DATABASE_URL` | No | Bring-your-own DB for the test suite. | — | Backend | — | CI/local tests only |

### Web (`apps/web`) — frontend, set on Vercel

| Variable | Required? | Purpose | Default | Side | Secret? | Deployment target |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | API base incl. `/api/v1`. **Inlined at build time.** Use `/api/v1` (relative) when using the proxy; else `https://api.x.com/api/v1`. | `http://localhost:4000/api/v1` (fallback) | Frontend (public) | No | Vercel (Production) |
| `API_PROXY_TARGET` | **Yes (for the proxy path)** | API origin the Next server rewrites `/api/*` to. **Enables the same-site cookie fix.** Unset → no proxy. | unset | Frontend (server-side) | No | Vercel |
| `NEXT_PUBLIC_CURRENCY` | No | Display currency symbol. | `₹` | Frontend (public) | No | Vercel |
| `NEXT_PUBLIC_SENTRY_DSN` | No | (If you add Sentry per OBSERVABILITY.md.) | — | Frontend (public) | No | Vercel |

### Database (Neon / Supabase / RDS / Railway PG)
The DB has no "variables" of its own; it **produces** the `DATABASE_URL`/`DIRECT_URL` strings you paste
into the API. Must support TLS — append `?sslmode=require`.

### Documentation gaps — status after the 2026-06-05 remediation
- ✅ **`DIRECT_URL`** is now documented in `apps/api/.env.example` and `render.yaml`, and the stale doc
  lines are corrected. **Intentionally not added to `config/env.ts`** (would crash the test suite — see
  [Risk D1](#d1)), so it is **not** enforced at server boot and must be set in each Prisma-CLI
  environment. (Minor/`NOT VERIFIED`: `docs/ENVIRONMENT.md` does not yet list it — update if you wish.)
- ✅ **`API_PROXY_TARGET`** is now documented in `apps/web/.env.example` and `DEPLOY_STOCKEASY.md` §2
  (and already in `docs/DEPLOY_FREE.md`). (Minor: still not in `docs/ENVIRONMENT.md`'s table.)
- ✅ All other variables are consistent across `env.ts` and the docs.

---

## SECTION 7 — DEPLOYMENT OPTIONS COMPARISON

The repository is **purpose-built for Vercel** (App Router, `next.config.mjs` rewrites/headers, **no
`output:'standalone'`, no Dockerfile**) and a **plain Node host for the API** (`tsc`→`node dist`). The DB
is **vanilla PostgreSQL** (the app uses no Supabase SDK/auth — Supabase would be "just Postgres" here).
Ratings: 1–10 (higher = better for your stated goals: portfolio / resume / recruiter demos / free).

### Option A — Vercel (web) + Railway (API) + Supabase (DB)
| Criterion | Assessment |
|---|---|
| Cost | Web $0, **Railway ~$5/mo** (no free always-on after trial), Supabase free. **≈ $5/mo.** |
| Complexity | Low — all Git-connected, dashboard-driven. |
| Reliability | High — **Railway has no cold start**; Supabase managed. ⚠️ Supabase free **pauses after ~7 days inactivity** (`NOT VERIFIED` — confirm current terms). |
| Resume value | High — "Next.js/Vercel, Node/Railway, Postgres/Supabase, CI." |
| Portfolio/recruiter | High — always-on demo (no 50s wake-up). |
| Performance | High. | Security | High (same as all). | Scalability | Good (vertical + replicas; stateless API). |
| **Rating** | **8.5 / 10** (best "always-on" for ~$5). |

### Option B — Vercel (web) + Render (API) + Supabase (DB)
| Criterion | Assessment |
|---|---|
| Cost | **$0** possible (Render free) or $7/mo to stay warm. |
| Complexity | Low — **`render.yaml` Blueprint already in repo** (once `DIRECT_URL` is added). |
| Reliability | Medium — **Render free spins down on idle** → ~50s cold start / proxy 504 unless kept warm (`keep-warm.yml` + UptimeRobot exist). |
| Resume/portfolio | High; recruiter demo only good **with keep-warm** active. |
| Performance | High warm, poor on cold start. | Security/Scalability | High / Good. |
| **Rating** | **8 / 10** free (with keep-warm), **9/10** at $7/mo. Lowest-friction because the Blueprint exists. |

### Option C — Cloudflare Pages (web) + Railway (API) + Supabase (DB)
| Criterion | Assessment |
|---|---|
| Cost | Web $0, Railway ~$5, Supabase $0. **≈ $5/mo.** |
| Complexity | **High / risky** — Next.js 15 App Router on Cloudflare Pages needs the **`@cloudflare/next-on-pages`** adapter + edge-runtime compatibility; **the repo has no Cloudflare adapter/config and uses Node-style Next**. The `/api/*` rewrite proxy behavior on Pages is **`NOT VERIFIED`**. This is an unproven port. |
| Reliability | Unknown until ported. | Resume value | High (edge), but only if it actually works. |
| Performance | Potentially excellent (edge CDN). | Security/Scalability | High / High. |
| **Rating** | **5 / 10** — extra engineering with real risk; not recommended for a non-engineer. |

### Option D — Full self-hosted VPS (Docker/PM2 + Nginx/Caddy + self-managed PostgreSQL)
| Criterion | Assessment |
|---|---|
| Cost | **~$4–6/mo** one box. |
| Complexity | **Highest** — **no Dockerfile exists** and `next.config` has **no `output:'standalone'`**, so you'd add both (a code change), plus OS patching, TLS, backups, process management. Single-domain makes the cookie trivially same-site (a plus). |
| Reliability | You own uptime/backups → lower unless you're diligent. |
| Resume value | **Highest "I can do ops" signal.** | Portfolio/recruiter | Good once stable. |
| Performance | Good. | Security | You own it (more responsibility). | Scalability | Manual. |
| **Rating** | **4.5 / 10** for *this* owner (non-engineer, wants free/low-effort). Great learning project later. |

### 🏆 Recommendation
For **portfolio + resume + recruiter demos + free/near-free**, choose **Option B (Vercel + Render + Neon
or Supabase) using the in-repo Blueprint + the Next.js proxy**, and **upgrade the API to Railway
(Option A, ~$5/mo) if cold-start wake-ups hurt your demos.** Rationale: it's the **only option the repo is
already wired for** (`render.yaml`, the `/api/*` proxy), needs **no code change** beyond the `DIRECT_URL`
fix, and costs **$0** to start.

> **Neon vs Supabase:** `render.yaml` and `docs/*` reference **Neon**, and Neon's branching/PITR suits a
> portfolio. Supabase works identically (vanilla Postgres) but its free project **pauses on inactivity**.
> Either is fine; the document defaults to **Neon** for the recommended plan and treats Supabase as a
> drop-in for the variable `DATABASE_URL`/`DIRECT_URL`.

---

## SECTION 8 — RECOMMENDED DEPLOYMENT PLAN

**Architecture (free to start, $5/mo to make it always-on):**

| Layer | Host | Why |
|---|---|---|
| **Frontend** | **Vercel**, root dir `apps/web` | Zero-config Next.js 15; emits the security headers; **runs the `/api/*` proxy** that makes the Strict cookie work with no custom domain. |
| **Backend** | **Render** (free, Blueprint) → upgrade to **Railway (~$5/mo)** for always-on | `render.yaml` already defines it; Render free is $0 (kept warm); Railway removes cold starts for live demos. |
| **Database** | **Neon** (free) | Serverless Postgres, branching + PITR; pairs cleanly with `DATABASE_URL`/`DIRECT_URL`. |
| **AI** | Google Gemini (`gemini-2.5-flash`) | Optional; `/ai` returns 503 without a key. |
| **Keep-warm** | UptimeRobot (5-min `/health`) + repo `keep-warm.yml` | Avoids Render cold-start 504 through the proxy. |

**Domain requirements:** **None required** on the free path — the Next proxy keeps the cookie first-party
on `*.vercel.app`. A **custom domain (~$1/mo)** is optional polish (and the only way to go same-site
*without* the proxy). **DNS:** none for the free path; with a domain, `CNAME app→Vercel`, `CNAME
api→Render/Railway`. **SSL:** automatic on Vercel/Render/Railway (Let's Encrypt); Neon requires
`sslmode=require`. **Monitoring:** `/health` uptime monitor; Pino JSON logs in the host viewer;
Sentry-ready (`docs/OBSERVABILITY.md`) but not wired.

**Why this is best (evidence-based):**
1. **It's what the repo is built for** — no `output:'standalone'`/Dockerfile (rules out easy VPS/Cloudflare),
   `render.yaml` present, proxy present.
2. **No application code change** is needed (only the `DIRECT_URL` env/config fix).
3. **$0 entry, $5 upgrade** matches "free or near-free."
4. **Recruiter-ready**: a real link that stays logged in across reloads (proxy) and stays awake (keep-warm
   or Railway).

**The two non-negotiables for this plan to work:**
- ✅ Set **`DIRECT_URL`** (Blocker 1) on the API host build + locally + CI.
- ✅ Set **`API_PROXY_TARGET`** (API origin) and **`NEXT_PUBLIC_API_URL=/api/v1`** on Vercel (Blocker 2).

---

## SECTION 9 — DEPLOYMENT CHECKLIST

Executable by a non-developer. Replace `<...>` placeholders. Commands run from a terminal in the repo.

### A. GitHub & repository setup
- [ ] Create accounts: **GitHub, Neon, Render** (or Railway), **Vercel**, **UptimeRobot**, (optional)
  **Google AI Studio** for a Gemini key.
- [ ] Push the repo to GitHub (the root `.gitignore` keeps secrets/builds out):
  ```bash
  git init -b main && git add -A && git commit -m "Stock Easy"
  git remote add origin https://github.com/<you>/stock-easy.git && git push -u origin main
  ```
- [ ] Confirm no secrets committed: `git ls-files | grep -i env` → should list **only** `*.env.example`.

### B. One-time code/config fix (Blocker 1) — ✅ ALREADY APPLIED in this repo (2026-06-05)
- [x] `DIRECT_URL` declared in `apps/api/.env.example` and `render.yaml` (`- key: DIRECT_URL` / `sync: false`).
- [x] Five stale "no directUrl" doc lines corrected (`DEPLOY_STOCKEASY.md`, `docs/DEPLOY_FREE.md`).
- [ ] *(Recommended, NOT done — makes the integration suite / CI pass)* in
  `apps/api/tests/setup/global-setup.ts`, pass `DIRECT_URL: url` in the `migrate deploy` `env`.
- [ ] *(Optional, NOT done — would break the Vitest suite unless paired)* enforce at boot: add
  `DIRECT_URL: z.string().min(1)` to `apps/api/src/config/env.ts` **and**
  `process.env.DIRECT_URL ||= process.env.DATABASE_URL;` to `tests/setup/test-env.ts` (both, or tests crash).
- [ ] Commit + push (if not already).

### C. Database setup (Neon)
- [ ] Neon → New Project (region near your API). Copy the **direct** connection string; append
  `?sslmode=require`.
- [ ] Save it — you'll paste it as **both** `DATABASE_URL` and `DIRECT_URL` (non-pooled), or use the
  pooled string for `DATABASE_URL` and the direct one for `DIRECT_URL`.

### D. Migration setup (run locally against Neon)
- [ ] In `apps/api`, set both vars for this shell, then migrate:
  ```bash
  # PowerShell:
  $env:DATABASE_URL="postgresql://...sslmode=require"; $env:DIRECT_URL=$env:DATABASE_URL
  npm ci; npm run prisma:generate; npm run db:migrate
  npx prisma migrate status      # expect: no pending migrations
  # Optional demo data (portfolio only): npm run db:seed
  ```

### E. Backend deployment (Render Blueprint)
- [ ] Render → New → **Blueprint** → pick the repo → Apply (reads `render.yaml`).
- [ ] Set dashboard env (sync:false): `DATABASE_URL`, **`DIRECT_URL`**, `CORS_ORIGIN` (placeholder for
  now), `GEMINI_API_KEY` (optional). `JWT_*` auto-generate; `NODE_ENV=production` is in the Blueprint.
- [ ] Deploy → wait for green → copy the API URL, e.g. `https://stockeasy-api.onrender.com`.
- [ ] `curl https://stockeasy-api.onrender.com/health` → `{"success":true,"data":{"status":"ok"...}}`.

### F. Frontend deployment (Vercel)
- [ ] Vercel → Add New → Project → import repo. **Root Directory = `apps/web`** (critical).
- [ ] Production env:
  - `API_PROXY_TARGET = https://stockeasy-api.onrender.com`
  - `NEXT_PUBLIC_API_URL = /api/v1`
  - `NEXT_PUBLIC_CURRENCY = ₹` (optional)
- [ ] Deploy → copy the app URL, e.g. `https://stockeasy.vercel.app`.

### G. Close the loop (CORS)
- [ ] In Render, set `CORS_ORIGIN = https://stockeasy.vercel.app` (exact) → save (redeploys).

### H. DNS configuration (only if using a custom domain — optional)
- [ ] `CNAME app → cname.vercel-dns.com`; `CNAME api → <Render/Railway target>`; set
  `NEXT_PUBLIC_API_URL=https://api.x.com/api/v1`, `API_PROXY_TARGET` may be dropped, `CORS_ORIGIN=https://app.x.com`.

### I. Keep-warm (free API)
- [ ] UptimeRobot → HTTP monitor on `https://stockeasy-api.onrender.com/health`, interval 5 min. (Optional:
  set repo Actions variable `API_HEALTH_URL` to enable `keep-warm.yml`.)

### J. Post-deployment verification
- [ ] `curl <api>/health` → 200.
- [ ] Open the web app → sign in (`owner.apollo@stockeasy.test` / `StockEasy123!` if seeded).
- [ ] **Reload the page → still logged in** (proves the proxy/cookie path).
- [ ] Wait >15 min, click around → still authenticated (refresh works).
- [ ] DevTools → Network: `/api/v1/*` calls go to the **web** origin, return 200, **no CORS errors**.
- [ ] Admin (`admin@stockeasy.app`) sees Approvals/Tenants/Plans/Platform-Analytics.
- [ ] Make a POS sale → bill created; nearest-expiry batch consumed.
- [ ] (If `GEMINI_API_KEY` set) AI answers; else clean 503, no crash.
- [ ] `curl -I <web>` shows `Content-Security-Policy`, `Strict-Transport-Security`; no `X-Powered-By`.

---

## SECTION 10 — SERVICE CONFIGURATION REFERENCE

All values verified from `package.json`, `tsconfig.json`, `render.yaml`, `next.config.mjs`, `schema.prisma`.

### Frontend (Vercel) — `apps/web`
| Setting | Value | Source |
|---|---|---|
| Root directory | **`apps/web`** | monorepo, no root workspace |
| Install command | `npm ci` (`npm install` also fine) | default |
| Build command | `next build` (= `npm run build`) | `package.json` |
| Output directory | `.next` (managed by Vercel) | Next default |
| Start command (if self-hosting) | `next start` (= `npm start`) | `package.json` |
| Node version | **20** (`engines: ">=20"`) | `package.json` |
| Required build-time env | `NEXT_PUBLIC_API_URL` (+ `API_PROXY_TARGET` for the proxy) | `lib/env.ts`, `next.config.mjs` |

### Backend (Render/Railway) — `apps/api`
| Setting | Value | Source |
|---|---|---|
| Root directory | **`apps/api`** | monorepo |
| Install command | `npm ci` | `render.yaml` uses `npm ci --include=dev` |
| Build command | `prisma generate && tsc` → e.g. `npm run prisma:generate && npm run build` (Render Blueprint also runs `npm run db:migrate` in build) | `package.json`, `render.yaml` |
| Start command | **`npm start`** = `node dist/server.js` | `package.json:start` |
| Health check path | **`/health`** (no DB I/O) | `app.ts:51`, `render.yaml` |
| Node version | **≥20** (`engines`); CI uses 20; pin to 20 | `package.json`, `ci.yml` |
| TS build | `target ES2022`, `module CommonJS`, `outDir dist`, excludes `prisma/seed.ts` | `tsconfig.json` |
| Listen port | `env.PORT` (host-injected; default 4000) | `server.ts:11` |
| Required runtime env | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production` | `config/env.ts` |
| Required **build/migrate** env | **`DIRECT_URL`** (+ `DATABASE_URL`) | `schema.prisma:24` (**Blocker 1**) |
| ⚠️ No `postinstall` | `prisma generate` **must** be in the build command | `package.json` |

### Database
| Setting | Value | Source |
|---|---|---|
| Engine | PostgreSQL 14+ (tested 16); needs `pgcrypto` | migrations |
| Connection string | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` (+ optional `&connection_limit=N`) | `.env.example`, test-env |
| SSL | **Required** on managed PG → `?sslmode=require` | docs |
| `DATABASE_URL` | runtime (Prisma Client) + migrations | `schema.prisma:23` |
| `DIRECT_URL` | **all Prisma CLI** (migrate/validate/seed) | `schema.prisma:24` |
| Apply migrations | `npm run db:migrate` (`prisma migrate deploy`) | `package.json` |
| Seed (demo only) | `npm run db:seed`; verify `npm run seed:verify` | `package.json` |

---

## SECTION 11 — DEPLOYMENT RISKS

Each: **cause → symptoms → resolution.** The first two are the headline blockers.

<a id="a1"></a>
### A1 — Cross-site refresh cookie withheld — ✅ proxy path documented (2026-06-05); residual = set the env vars
- **Cause:** refresh cookie is `SameSite=Strict` (`auth/controller.ts`) and the web refresh call sends
  an empty body relying on the cookie (`client.ts`). On different registrable domains
  (`*.vercel.app` ↔ `*.onrender.com`) the browser won't send it.
- **Symptoms:** login works, then **logged out after ~15 min or on any page reload**; `/auth/refresh`
  returns 401; no obvious error.
- **Done:** the in-repo Next `/api/*` proxy is **unchanged** (no code change); its activation is now
  documented in `apps/web/.env.example` and `DEPLOY_STOCKEASY.md` §2.
- **Residual (you must still do):** set **`API_PROXY_TARGET=<api origin>`** + **`NEXT_PUBLIC_API_URL=/api/v1`**
  on Vercel (use the in-repo proxy), **or** put web+API on one registrable domain (`app.x.com`+`api.x.com`).
  The cookie attributes and the empty-body refresh were intentionally left unchanged (a matched pair). (Only
  as a last resort, for a true cross-site split: make `sameSite`/`secure` env-driven — a code change, out
  of scope here.)

<a id="d1"></a>
### D1 — `DIRECT_URL` required by Prisma CLI — ✅ config-remediated (2026-06-05); residual = set the value + tests
- **Cause:** the schema declares `directUrl = env("DIRECT_URL")`; at audit time it was set nowhere.
  **Proven:** `prisma validate` / `migrate status` → `P1012 Environment variable not found: DIRECT_URL`.
- **Symptoms (if the value is unset):** Render build dies at `npm run db:migrate`; local
  `db:migrate`/`db:seed` fail; CI `api-tests` job fails in `global-setup.ts` (`prisma migrate deploy`).
- **Done:** `DIRECT_URL` is now declared in `apps/api/.env.example` and `render.yaml`; stale docs fixed.
  **Re-verified:** `DIRECT_URL=… npx prisma validate` → *valid 🚀*; `… migrate status` → *Database schema
  is up to date!* (no P1012).
- **Residual (you must still do):**
  1. **Set the value** in the Render/Railway dashboard, CI, and your local shell / `apps/api/.env`
     (non-pooled DB → `DIRECT_URL = DATABASE_URL`).
  2. **Tests/CI:** `env.ts` was left unchanged (requiring `DIRECT_URL` there crashes the Vitest suite,
     which never sets it). To make the integration suite pass, add `DIRECT_URL: url` to the `migrate
     deploy` env in `apps/api/tests/setup/global-setup.ts`. To *also* enforce at boot, add
     `DIRECT_URL: z.string().min(1)` to `env.ts` **and** `process.env.DIRECT_URL ||= process.env.DATABASE_URL`
     to `tests/setup/test-env.ts` (both together, or the suite fails to load).

### A2 — CORS rejection
- **Cause:** `CORS_ORIGIN` not equal to the browser origin, contains `*`, wrong scheme, or trailing slash
  (`env.ts:23-28`, `app.ts:41`).
- **Symptoms:** browser console "blocked by CORS policy"; API calls fail only from the browser.
- **Resolution:** set `CORS_ORIGIN` to the **exact** web origin (e.g. `https://stockeasy.vercel.app`),
  comma-separate multiples, never `*`, redeploy the API.

### A3 — Process exits on boot: "Invalid environment configuration"
- **Cause:** `config/env.ts` exits(1) on any missing/invalid var — commonly `JWT_*` < 16 chars, missing
  `DATABASE_URL`, or `CORS_ORIGIN` absent/`*`.
- **Symptoms:** API container starts then immediately exits; logs print the failing fields.
- **Resolution:** supply all required vars with valid values; regenerate JWT secrets (48-byte hex).

### A4 — `@prisma/client did not initialize`
- **Cause:** build didn't run `prisma generate` (no `postinstall`).
- **Symptoms:** runtime error referencing Prisma client init.
- **Resolution:** ensure the build runs `prisma generate` before `tsc` (the Blueprint/CI do).

### A5 — Cookie not `Secure` / rejected
- **Cause:** `NODE_ENV` ≠ `production` in prod → `secure:false`; or serving over HTTP.
- **Symptoms:** cookie not stored; auth fails intermittently; browser warnings.
- **Resolution:** `NODE_ENV=production` + HTTPS everywhere.

### D2 — Database SSL / connection errors
- **Cause:** missing `?sslmode=require`, wrong host, pooled-vs-direct mismatch.
- **Symptoms:** Prisma `P1001`/SSL errors at migrate or runtime.
- **Resolution:** append `?sslmode=require`; use the direct string for `DIRECT_URL`; verify host/region.

<a id="d3"></a>
### D3 — Migrations run in the build step
- **Cause:** `render.yaml` build command includes `npm run db:migrate`.
- **Symptoms:** a bad/slow migration fails the *build*; with multiple instances, concurrent migrate runs.
- **Resolution:** acceptable for a single free instance; for robustness move migration to a release/
  pre-deploy hook and keep the build to `generate + tsc`.

### A6 — Render cold start (free tier)
- **Cause:** Render free spins down on idle.
- **Symptoms:** first request ~50s; Vercel proxy may 504.
- **Resolution:** UptimeRobot 5-min `/health`; or upgrade to Railway/paid.

### A7 — Wrong root directory (monorepo)
- **Cause:** Vercel/Render targeting the repo root (no root `package.json` scripts).
- **Symptoms:** "no build detected" / 404 / build can't find the app.
- **Resolution:** Vercel root = `apps/web`; Render root = `apps/api`.

### A8 — `NEXT_PUBLIC_API_URL` baked wrong (build-time inline)
- **Cause:** it's inlined at `next build`; changing it later needs a **rebuild**. A blank value falls back
  to `localhost`.
- **Symptoms:** prod app calls `localhost`; CSP `connect-src` wrong; calls blocked.
- **Resolution:** set it **before** building; on the proxy path use `/api/v1`; redeploy after changes.

### A9 — Leaked Gemini key
- **Cause:** a real key sits in `apps/api/.env:11` (gitignored, but present locally).
- **Symptoms:** potential quota abuse if the file is ever shared.
- **Resolution:** **rotate** the key; set the new one only in the host secret store.

### D4 — Domain/DNS misconfig (only if using a custom domain)
- **Cause:** wrong CNAME targets; mixing same-site assumptions with the proxy.
- **Symptoms:** TLS pending; cookie/CORS mismatches.
- **Resolution:** follow host-provided CNAME targets; pick **one** model (proxy **or** subdomain split) and
  set `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL` to match.

---

## SECTION 12 — OPERATIONAL HANDBOOK

Derived from `docs/OPERATIONS.md`, `docs/OBSERVABILITY.md`, and verified code.

**Daily operations**
- Watch `GET /health` (uptime monitor). Tail Pino JSON logs in the host viewer; filter by the request-id
  field to trace one request. Keep the free API warm (UptimeRobot).

**Updating code**
- Push to `main` → Vercel + Render/Railway auto-deploy; PRs get Vercel previews. Enable **branch
  protection on `main`** requiring CI checks (`web`, `api-quality`, `api-tests`).

**Running migrations**
- Author locally: `npx prisma migrate dev --name <change>` (dev DB) → commit `prisma/migrations/`.
- Apply in prod **before** new code serves: `cd apps/api && npm run db:migrate` (needs `DATABASE_URL` +
  `DIRECT_URL`). Verify `npx prisma migrate status`. Never edit an applied migration — roll forward.

**Rotating secrets**
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`: generate fresh
  (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), update the host secret
  store, redeploy. **Rotating JWT secrets logs everyone out** (expected). **Rotate the dev Gemini key now.**

**Database backups**
- Use managed PITR (Neon history/branches; Supabase/RDS backups) — enable it. Self-managed: nightly
  `pg_dump` off-host + **test restores** periodically. Recovery: restore → repoint `DATABASE_URL` → redeploy.

**Monitoring**
- Live today: `/health` + Pino structured logs + a uniform error envelope (`errorHandler`). Watch: 5xx
  rate, p95 latency, abnormal 401/refresh-reuse spikes, AI 5xx/503, DB connections/disk. Sentry is
  **ready-to-enable** (DSN-gated) per `docs/OBSERVABILITY.md` but **not wired** (`NOT VERIFIED` in prod).

**Incident response**
- API down → check `/health`, host logs, env validation (did it exit on boot?), DB reachability.
- Auth broken after deploy → re-check Blocker 2 (proxy/CORS/`NODE_ENV`) and whether JWT secrets changed.
- AI failing → `GEMINI_API_KEY` set? Gemini status? (503 is the designed "no key" response.)

**Rollback procedures**
- **Web:** Vercel → Instant Rollback / promote a prior deployment.
- **API:** redeploy the previous release/image.
- **DB:** roll forward with a corrective migration; for data loss restore from PITR. Never hand-revert
  applied migrations.

**Maintenance gotchas (verified in OPERATIONS.md)**
- `postcss` is pinned via `apps/web` `overrides`; **do not** `npm audit fix --force` (it tries to
  downgrade Next.js). Keep Node ≥20 and **Prisma on 6.x** (7 dropped `url`). `next lint` is deprecated for
  Next 16 — migrate to ESLint CLI when upgrading.

---

## SECTION 13 — AGENT HANDOFF DOCUMENT

*Self-contained brief so a future AI agent can act without re-auditing.*

**What:** Stock Easy — multi-tenant pharmacy inventory + POS SaaS. **FEFO** selling, analytics, and a
**safe tool-calling** Gemini assistant. Monorepo, **no root workspace**.

**Stack:** Web = Next.js 15 (App Router) + React 19 + TS + Tailwind + Radix + TanStack Query + Axios
(`apps/web`). API = Express 4 + TS + Prisma 6 + PostgreSQL, compiled `tsc`→`dist`, run `node dist/server.js`
(`apps/api`). AI = `@google/genai`, `gemini-2.5-flash`.

**Architecture:** modular monolith API (`routes→controller→service→repository→prisma`, middleware
cross-cuts). Uniform `{success,data,meta}` envelope. Money is `Decimal` (ROUND_HALF_UP@2dp, GST
tax-exclusive, serialized as 2dp strings via `Money.install()`). FEFO sale = per-shop
`pg_advisory_xact_lock` + `SELECT … FOR UPDATE` (expiry ASC) + guarded decrement + idempotency +
`stock_movements` ledger, all in one tx.

**Deployment (recommended, what the repo is wired for):** Vercel (`apps/web`) + Render Blueprint
(`apps/api`, `render.yaml`) + Neon Postgres. Web build `next build`; API build `prisma generate && tsc`,
start `node dist/server.js`, health `/health`. CI (`.github/workflows/ci.yml`) is a **gate, not a
deployer**; hosts auto-deploy on push to `main`.

**Environment (must-haves):** API → `NODE_ENV=production`, `DATABASE_URL`, **`DIRECT_URL`**,
`JWT_ACCESS_SECRET`(≥16), `JWT_REFRESH_SECRET`(≥16), `CORS_ORIGIN`(exact web origin, no `*`),
`GEMINI_API_KEY`(optional). Web → `NEXT_PUBLIC_API_URL` (inlined at build; use `/api/v1` with the proxy),
**`API_PROXY_TARGET`** (API origin). Env is **fail-fast** (`config/env.ts` exits on invalid).

**Auth:** JWT access (15 min, **in browser memory only**) + opaque rotating refresh (30 d, SHA-256-hashed
in DB, family + reuse detection) in an httpOnly cookie `se_refresh` — **`SameSite=Strict`, path
`/api/v1/auth`, `secure` in prod**. Refresh call sends an **empty body**, relies on the cookie. RBAC:
`central_admin` / `shop_owner` / `shop_staff` via `authenticate`+`authorize`; `requireApprovedShop` reads
live `shop.status`. Tenant scope = JWT `shopId`, never client input. Optional RLS in `prisma/rls.sql`.

**Infrastructure:** stateless API → horizontal scale, no sticky sessions; shared state = PostgreSQL.
Helmet + CSP/HSTS/COOP/CORP; rate limits 300/20/60 per 15 min (general/auth/AI). Logs = Pino JSON to
stdout. No Dockerfile; `next.config` has **no `output:'standalone'`** (VPS/Cloudflare need extra work).

**🔴 Critical constraints / known caveats** (status as of the 2026-06-05 config remediation):
1. **`DIRECT_URL`** (the schema declares `directUrl`) is required by all Prisma CLI commands. ✅ Now
   declared in `.env.example` + `render.yaml` and re-verified (`prisma validate` valid; `migrate status`
   clean — no P1012). **Residual:** the operator must set the *value* per environment; `env.ts` does
   **not** enforce it (by design — would crash the Vitest suite); the **CI `api-tests` job still fails**
   until `tests/setup/global-setup.ts` passes `DIRECT_URL` to its `migrate deploy`.
2. **`SameSite=Strict` cookie** → web+API must be same-site: use the **Next `/api/*` proxy**
   (`API_PROXY_TARGET`+`NEXT_PUBLIC_API_URL=/api/v1`, ✅ now documented) or one custom domain. A bare
   `*.vercel.app` + `*.onrender.com` split logs users out. Cookie + empty-body refresh left unchanged.
3. `NEXT_PUBLIC_API_URL` is **build-time inlined** (rebuild to change).
4. **No `postinstall`** → build must run `prisma generate`.
5. A **real Gemini key sits in `apps/api/.env`** (gitignored) → **rotate** before sharing/deploying.
6. `render.yaml` runs `db:migrate` in the **build** step (fine for one instance; needs `DIRECT_URL` set).
7. Pin **Prisma 6.x**, **Node ≥20**; don't `npm audit fix --force` (postcss/Next pin).

**Quick verify after deploy:** `curl <api>/health` → 200; sign in; **reload stays logged in**; `/api/v1/*`
hit the web origin with no CORS errors.

---

## SECTION 14 — FINAL RECOMMENDATION

1. **Recommended architecture:** **Vercel (`apps/web`) + Render Blueprint (`apps/api`) + Neon Postgres**,
   using the **in-repo Next `/api/*` proxy** for first-party cookies and **UptimeRobot** keep-warm. Set
   the **`DIRECT_URL`** value at deploy time (its config + docs fix already landed 2026-06-05). Upgrade the
   API to **Railway (~$5/mo)** when you want zero cold starts for recruiter demos. (Supabase is a drop-in
   for the DB if you prefer.)

2. **Expected monthly cost:**
   - **Free path:** **$0** (Vercel Hobby + Render free + Neon free).
   - **Always-on path:** **≈ $5/mo** (swap Render→Railway) **+ ~$1/mo** optional domain → **≈ $5–6/mo**.

3. **Free-tier limitations** (`NOT VERIFIED` — providers change terms; confirm at signup):
   - **Render free** spins down on idle → ~50s cold start (mitigated by keep-warm; still counts against
     ~750 instance-hours/mo).
   - **Neon free** has compute/storage limits and may auto-suspend idle compute (fast resume).
   - **Supabase free** projects **pause after ~7 days inactivity** (if you choose Supabase).
   - **Vercel Hobby** is non-commercial, with bandwidth/build limits.
   - **Gemini free tier** has rate/quota limits.

4. **Domain requirements:** **None** on the free path (proxy keeps the cookie first-party). A custom
   domain (~$10–12/yr) is **optional** polish and the only same-site option *without* the proxy.

5. **Production-readiness — 8/10** (was 7.5 at audit; **+0.5** for the 2026-06-05 `DIRECT_URL` config fix
   + corrected docs). Strong: fail-fast env, Helmet+CSP/HSTS, rate limits, bcrypt + rotating refresh w/
   reuse detection, Decimal money, idempotent FEFO with row/advisory locks, real-PG integration tests,
   health check, structured logs, uniform errors. Remaining gaps: deploy-time values still to be set, the
   **CI `api-tests` job still needs the `global-setup.ts` `DIRECT_URL` one-liner**, error monitoring
   (Sentry) not wired, RLS opt-in, migrations run in build. → **9/10 once the test-harness `DIRECT_URL`
   line lands and Sentry is enabled.**

6. **Resume-readiness — 9/10.** Modern, recognizable, non-trivial: multi-tenant SaaS, FEFO with
   concurrency control, money correctness, safe LLM tool-calling, CI with Testcontainers, clean layering.
   Excellent talking points.

7. **Portfolio-readiness — 8.5/10.** Polished responsive UI (design system, Lighthouse 94/95/96/100 per
   README — `NOT VERIFIED` here), seeded demo (8 shops, role logins), live link feasible for $0–6/mo.
   Deduction only for the two deploy blockers a viewer could hit; **9.5/10** once fixed and live on a domain.

| Category | Score |
|---|---|
| Production-readiness | **8 / 10** (was 7.5; → 9 after the test-harness `DIRECT_URL` line + Sentry) |
| Resume-readiness | **9 / 10** |
| Portfolio-readiness | **8.5 / 10** (9.5 once live on a domain) |

---

## DEPLOYMENT QUICK START GUIDE (one page)

> **Goal:** a free, working, recruiter-shareable Stock Easy at `https://<you>.vercel.app`.
> **Two must-dos:** provide a `DIRECT_URL` *value* (the repo already declares it) and use the Vercel proxy
> (or you get logged out). Time: ~30–45 min. No coding required.

**0. Accounts:** GitHub, Neon, Render, Vercel, UptimeRobot. (Optional: Google AI Studio for a Gemini key.)

**1. Push to GitHub**
```bash
git init -b main && git add -A && git commit -m "Stock Easy"
git remote add origin https://github.com/<you>/stock-easy.git && git push -u origin main
```

**2. Blocker 1 — ✅ already done in the repo.** `render.yaml` already declares `DIRECT_URL`
(`- key: DIRECT_URL` / `sync: false`) and `apps/api/.env.example` documents it — you only set its
*value* in Step 5 (Render dashboard) and Step 4 (locally). *(Optional: to make the CI `api-tests` job
pass, add `DIRECT_URL: url` to the `migrate deploy` env in `apps/api/tests/setup/global-setup.ts`.)*

**3. Database (Neon):** New Project → copy the **direct** connection string → append `?sslmode=require`.

**4. Migrate (from `apps/api`, PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://...sslmode=require"; $env:DIRECT_URL=$env:DATABASE_URL
npm ci; npm run prisma:generate; npm run db:migrate; npm run db:seed   # seed = demo data
```

**5. Backend (Render):** New → **Blueprint** → pick repo → Apply. Set env: `DATABASE_URL`, **`DIRECT_URL`**,
`CORS_ORIGIN` (placeholder), `GEMINI_API_KEY` (optional). Deploy → copy `https://<api>.onrender.com` →
check `/health` returns 200.

**6. Frontend (Vercel):** New Project → import repo → **Root Directory = `apps/web`**. Env:
`API_PROXY_TARGET=https://<api>.onrender.com`, `NEXT_PUBLIC_API_URL=/api/v1`. Deploy → copy
`https://<you>.vercel.app`.

**7. Connect (CORS):** back in Render set `CORS_ORIGIN=https://<you>.vercel.app` → save (redeploys).

**8. Keep warm:** UptimeRobot → HTTP monitor on `https://<api>.onrender.com/health`, every 5 min.

**9. Test:** open the app → sign in `owner.apollo@stockeasy.test` / `StockEasy123!` → **reload → still
logged in** ✅ → make a sale ✅. Admin login: `admin@stockeasy.app` / `StockEasy123!`.

**If logged out on reload:** `API_PROXY_TARGET` missing or `NEXT_PUBLIC_API_URL` ≠ `/api/v1`.
**If build fails at migrate:** `DIRECT_URL` not set. **If CORS error:** `CORS_ORIGIN` ≠ your exact Vercel URL.
**First load slow (~50s):** Render cold start — the keep-warm monitor fixes it.

---

*End of reference. Everything above is traceable to a file path or a command output in this repository;
items that could not be confirmed from the code are marked `NOT VERIFIED`.*
