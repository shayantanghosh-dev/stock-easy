# Stock Easy — Software Architecture & Implementation Roadmap

> Medicine inventory SaaS for small pharmacies. FEFO-driven selling, analytics, and a GenAI assistant.
> Author: Architecture spec derived from `plans.pdf`. Status: **Design v1**.

---

## 0. Executive Summary

Stock Easy is a **multi-tenant B2B SaaS**. Each pharmacy is a **tenant** (`shops` row). A central team
verifies drug licenses and oversees the platform. The product's core differentiator is **FEFO
(First-Expiry-First-Out)** billing: every sale automatically consumes the batch closest to expiry first,
so stock moves before it becomes waste.

**Recommended stack (opinionated):**

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | "JS analytics dashboard" requirement; fast DX; huge ecosystem |
| UI / charts | Tailwind + shadcn/ui + **Recharts** | Clean dashboards with minimal effort |
| Server state | **TanStack Query** | Caching, retries, optimistic updates for POS |
| Backend | **Node.js + Express + TypeScript** | Same language as frontend; simple; easy to host |
| Validation | **Zod** | One schema shared client+server |
| ORM | **Prisma** | Type-safe, first-class transactions (needed for FEFO) |
| Database | **PostgreSQL 16** | Transactions, partial indexes, Row-Level Security for tenancy |
| Auth | **JWT (access+refresh) + Argon2id** | Stateless API, role-based access |
| AI | **Anthropic Claude (`claude-sonnet-4-6`)** | NL→SQL with tool use + prompt caching |
| Object storage | S3-compatible (R2 / S3 / Supabase) | Drug-license document uploads |
| Payments | **Stripe** (or **Razorpay** if India) | SaaS subscription billing |
| Jobs | **BullMQ + Redis** (phase 2) | Expiry alerts, report generation |

**Alternatives if you want more structure:** NestJS instead of Express (opinionated modules/DI), or
Next.js full-stack instead of React+Express (one deployable, API routes). The architecture below maps
cleanly onto either.

**The single most important design decision:** *never trust client-supplied `shop_id`, and never trust
LLM-generated SQL.* Tenant isolation is enforced from the JWT down through the DB (RLS), and the AI
assistant runs through a validation gauntlet on a read-only DB role. Everything else follows from these
two rules.

---

## 1. Complete Software Architecture

### 1.1 Architectural style

A **modular monolith** — one deployable backend, internally split into domain modules. This is the right
altitude for a small-pharmacy SaaS: microservices would be premature complexity. Modules are isolated
enough that any one could later be extracted into a service.

### 1.2 System context (C4 level 1)

```
                ┌──────────────────────────────────────────────┐
                │                  Users                        │
                │  Central Admin │ Shop Owner │ Shop Staff      │
                └───────┬───────────────┬──────────────┬────────┘
                        │ HTTPS         │              │
                        ▼               ▼              ▼
                ┌──────────────────────────────────────────────┐
                │        React SPA (Vite)  — apps/web           │
                └───────────────────────┬──────────────────────┘
                                        │ REST /api/v1 (JWT)
                                        ▼
                ┌──────────────────────────────────────────────┐
                │     Express API (modular monolith) — apps/api │
                │  ┌────────────────────────────────────────┐  │
                │  │ Middleware: reqId·log·auth·tenant·RBAC  │  │
                │  │            ·validate·rateLimit·errors   │  │
                │  ├────────────────────────────────────────┤  │
                │  │ Domain modules (routes→service→repo)    │  │
                │  │ auth shops admin dealers medicines      │  │
                │  │ batches billing analytics ai subs       │  │
                │  └────────────────────────────────────────┘  │
                └───┬───────────┬──────────┬─────────┬─────────┘
                    │ Prisma    │ SDK      │ SDK     │ SMTP
                    ▼           ▼          ▼         ▼
            ┌────────────┐ ┌─────────┐ ┌────────┐ ┌────────┐
            │ PostgreSQL │ │ Claude  │ │ Object │ │ Email  │
            │  (RLS)     │ │  API    │ │ Store  │ │ (alerts)│
            └────────────┘ └─────────┘ └────────┘ └────────┘
                    ▲
                    │ read-only role (AI) + app role (RLS)
```

### 1.3 Backend layering (inside every module)

```
HTTP route  →  Controller        (parse req, call service, shape response)
            →  Validation (Zod)  (reject bad input at the boundary)
            →  Service           (business logic, transactions, no Express types)
            →  Repository         (Prisma calls; always tenant-scoped)
            →  PostgreSQL
```

Rules:
- **Controllers** never touch Prisma. **Services** never touch `req`/`res`. This keeps business logic testable.
- A **base repository** auto-injects `where: { shopId }` so no query can forget tenant scoping.
- Cross-cutting concerns (auth, tenant context, logging, errors) live in **middleware**, not in modules.

### 1.4 Domain modules

| Module | Responsibility |
|---|---|
| `auth` | Register, login, refresh, logout, password, staff invites |
| `shops` | Tenant profile, license docs, verification status (read side) |
| `admin` | Central team: verification queue, approve/reject, platform analytics, plan CRUD |
| `dealers` | Suppliers per shop |
| `medicines` | Per-shop catalog of medicine types |
| `batches` | Physical stock with expiry; the FEFO source of truth |
| `billing` | POS sale → FEFO decrement → bill + bill_items (transactional) |
| `subscriptions` | SaaS plans, checkout, webhooks, entitlement enforcement |
| `analytics` | Dashboard aggregates, expiring-soon, dead-stock, sales trends |
| `ai` | NL→SQL assistant with the safety gauntlet |
| `notifications` | Email/alerts (verification decisions, expiry warnings) |

---

## 2. Folder Structure

A single repo with two apps and a shared package (works great as a final-project monorepo).

```
stock-easy/
├── apps/
│   ├── api/                                  # Express backend
│   │   ├── src/
│   │   │   ├── config/                       # env (zod-validated), constants
│   │   │   ├── lib/                          # prisma, claude, storage, mailer clients
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                    # verify JWT → req.user
│   │   │   │   ├── tenant.ts                  # set shop_id context (+ RLS GUC)
│   │   │   │   ├── rbac.ts                    # requireRole('central_admin'...)
│   │   │   │   ├── requireApprovedShop.ts     # block selling before approval
│   │   │   │   ├── validate.ts                # zod request validation
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── error.ts                   # central error → JSON envelope
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.schema.ts         # Zod DTOs
│   │   │   │   ├── shops/  admin/  dealers/  medicines/
│   │   │   │   ├── batches/
│   │   │   │   ├── billing/
│   │   │   │   │   ├── billing.routes.ts
│   │   │   │   │   ├── billing.controller.ts
│   │   │   │   │   ├── billing.service.ts     # FEFO transaction lives here
│   │   │   │   │   └── fefo.ts                # batch-allocation algorithm
│   │   │   │   ├── analytics/  subscriptions/
│   │   │   │   └── ai/
│   │   │   │       ├── ai.routes.ts
│   │   │   │       ├── ai.controller.ts
│   │   │   │       ├── ai.service.ts          # Claude call + orchestration
│   │   │   │       ├── sql-guard.ts           # AST validation, allowlist
│   │   │   │       └── schema-context.ts      # curated schema for the prompt
│   │   │   ├── jobs/                          # cron/queue workers (expiry alerts)
│   │   │   ├── utils/                         # errors, logger, pagination
│   │   │   ├── app.ts                         # build express app (mount routes)
│   │   │   └── server.ts                      # bootstrap + listen
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                        # central_admin user, demo plans
│   │   ├── tests/                            # unit + integration (FEFO, tenancy)
│   │   └── package.json
│   └── web/                                   # React frontend
│       ├── src/
│       │   ├── app/                           # router, providers, layout
│       │   ├── components/ui/                  # shadcn primitives
│       │   ├── features/                       # MIRRORS backend modules
│       │   │   ├── auth/  shops/  admin/
│       │   │   ├── dealers/  medicines/  inventory/
│       │   │   ├── billing/                     # POS screen + FEFO preview
│       │   │   ├── analytics/                   # charts/dashboard
│       │   │   └── assistant/                   # AI chat panel
│       │   ├── lib/                            # api client (axios), auth store (zustand)
│       │   ├── hooks/
│       │   ├── routes/                         # route components, guards
│       │   └── main.tsx
│       └── package.json
├── packages/
│   └── shared/                                # shared TS types + Zod schemas + enums
├── docker-compose.yml                         # postgres + redis for local dev
├── .env.example
├── ARCHITECTURE.md                            # this file
└── README.md
```

**Why mirror modules across `api` and `web`:** a feature ("billing") lives in one place on each side, so
navigation is predictable and onboarding (yours, or a reviewer's) is trivial.

---

## 3. Database Architecture

### 3.1 Principles

- **PostgreSQL**, single database, shared schema, **`shop_id` discriminator** on every tenant table.
- **UUID** primary keys (`gen_random_uuid()`) — no cross-tenant ID guessing, easy merges.
- **Enums** for fixed sets (roles, statuses). **`CHECK` constraints** for invariants (e.g. stock ≥ 0).
- Every tenant table is **indexed on `shop_id`**; FEFO gets a dedicated **partial index**.
- **Money** as `numeric(12,2)` (never floats). **Timestamps** `timestamptz`, `created_at`/`updated_at` everywhere.

### 3.2 Entity-relationship overview

```
users ──owns──┐
   │          ▼
   │       shops ─────────┬─────────┬──────────────┐
   │ (staff)│             │         │              │
   └────────┘          dealers   medicines      subscriptions ── plans
                          │         │
                          └────┬────┘
                               ▼
                            batches  (expiry, quantity_remaining)  ◀── FEFO
                               │
                               ▼
   bills ──1:N──▶ bill_items ──refs──▶ batches   (exact batch sold)
                               
   ai_query_logs (audit of every NL→SQL request)
```

### 3.3 Core tables

```sql
-- ENUMS
CREATE TYPE user_role         AS ENUM ('central_admin','shop_owner','shop_staff');
CREATE TYPE verification_status AS ENUM ('pending','approved','rejected');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE ai_log_status     AS ENUM ('success','blocked','error');

-- USERS  (central_admin has shop_id = NULL)
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid REFERENCES shops(id) ON DELETE CASCADE,
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- SHOPS  (the tenant)
CREATE TABLE shops (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  owner_user_id       uuid REFERENCES users(id),
  address             text,
  phone               text,
  license_number      text NOT NULL,
  license_doc_url     text,                         -- object-store key
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_by         uuid REFERENCES users(id),
  verified_at         timestamptz,
  rejection_reason    text,
  plan_id             uuid REFERENCES subscription_plans(id),
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- DEALERS  (suppliers, per shop)
CREATE TABLE dealers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name         text NOT NULL,
  contact_name text, phone text, email text, address text,
  tax_id       text,                                -- GSTIN etc.
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_dealers_shop ON dealers(shop_id);

-- MEDICINES  (catalog of TYPES, not stock; per shop)
CREATE TABLE medicines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          text NOT NULL,
  generic_name  text,
  manufacturer  text,
  category      text,
  form          text,                               -- tablet/syrup/...
  strength      text,                               -- 500mg
  unit          text NOT NULL DEFAULT 'unit',
  hsn_code      text,
  reorder_level integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name, strength, form)
);
CREATE INDEX ix_medicines_shop ON medicines(shop_id);

-- BATCHES  (physical stock → drives FEFO)
CREATE TABLE batches (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id            uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  medicine_id        uuid NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  dealer_id          uuid REFERENCES dealers(id) ON DELETE SET NULL,
  batch_number       text NOT NULL,
  expiry_date        date NOT NULL,
  quantity_received  integer NOT NULL CHECK (quantity_received > 0),
  quantity_remaining integer NOT NULL CHECK (quantity_remaining >= 0),
  cost_price         numeric(12,2) NOT NULL DEFAULT 0,
  mrp                numeric(12,2) NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
-- THE FEFO INDEX: only in-stock rows, ordered by expiry, scoped per shop+medicine
CREATE INDEX ix_batches_fefo
  ON batches (shop_id, medicine_id, expiry_date)
  WHERE quantity_remaining > 0;

-- BILLS  (one per sale)
CREATE TABLE bills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  bill_number    bigint NOT NULL,                   -- per-shop sequence
  customer_name  text, customer_phone text,
  sold_by        uuid NOT NULL REFERENCES users(id),
  subtotal       numeric(12,2) NOT NULL,
  discount       numeric(12,2) NOT NULL DEFAULT 0,
  tax            numeric(12,2) NOT NULL DEFAULT 0,
  total          numeric(12,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, bill_number)
);
CREATE INDEX ix_bills_shop_date ON bills(shop_id, created_at);

-- BILL_ITEMS  (line items, each tied to the EXACT batch consumed)
CREATE TABLE bill_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  batch_id    uuid NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_price  numeric(12,2) NOT NULL,
  line_total  numeric(12,2) NOT NULL
);
CREATE INDEX ix_bill_items_bill ON bill_items(bill_id);

-- AI_QUERY_LOGS  (audit every NL→SQL)
CREATE TABLE ai_query_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  question      text NOT NULL,
  generated_sql text,
  status        ai_log_status NOT NULL,
  row_count     integer,
  error_message text,
  model         text,
  latency_ms    integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- SUBSCRIPTION PLANS (managed by central team)
CREATE TABLE subscription_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  price            numeric(12,2) NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',
  max_users        integer, max_medicines integer,   -- NULL = unlimited
  features         jsonb NOT NULL DEFAULT '{}',
  is_active        boolean NOT NULL DEFAULT true
);
```

### 3.4 Notable decisions

- **One transaction per sale.** Bill + bill_items + every batch decrement commit or roll back together
  (exactly the spec requirement). See §7/§8.
- **`quantity_remaining` is denormalized** onto `batches` for O(1) FEFO. The `CHECK (>= 0)` constraint is
  the last line of defense against overselling under concurrency.
- **`bill_number` is a per-shop sequence**, not a global one, so each pharmacy sees 1,2,3… Implement with a
  small `shop_counters` table (`SELECT … FOR UPDATE`) or `max(bill_number)+1` inside the sale transaction.
- **Medicines are per-shop.** Simpler tenancy and no cross-tenant naming fights. (Alternative: a global
  shared catalog + per-shop overrides — more complex; defer.)
- **Soft deletes** optional: add `deleted_at` to medicines/dealers if you need to preserve history while
  hiding rows. Batches/bills should never be hard-deleted (audit trail).

---

## 4. API Architecture

### 4.1 Conventions

- **Base:** `/api/v1`. Resource-oriented REST. JSON in/out.
- **Auth:** `Authorization: Bearer <access_jwt>` on everything except `/auth/*` and `/health`.
- **Response envelope:**
  ```json
  { "success": true, "data": { ... }, "meta": { "page": 1, "total": 42 } }
  { "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "details": [] } }
  ```
- **Pagination:** `?page=&limit=` (cap limit at 100). **Filtering/sorting** via explicit query params.
- **Idempotency:** `POST /bills` accepts an `Idempotency-Key` header → prevents double-charge / double-decrement on retry.
- **Validation:** Zod at the boundary; 422 on failure with field errors.
- **Errors:** consistent codes (`UNAUTHENTICATED`, `FORBIDDEN`, `SHOP_NOT_APPROVED`, `INSUFFICIENT_STOCK`,
  `VALIDATION_ERROR`, `AI_QUERY_BLOCKED`, `RATE_LIMITED`).

### 4.2 Middleware chain (order matters)

```
requestId → logger → cors → helmet → rateLimit
          → authenticate (verify JWT → req.user)
          → tenantContext (req.user.shop_id → req.shopId + set RLS GUC)
          → authorize (role check per route)
          → requireApprovedShop (selling routes only)
          → validate(zod) → controller → service → repo
          → errorHandler (last)
```

### 4.3 Endpoint catalog

| Method & Path | Role | Purpose |
|---|---|---|
| `POST /auth/register` | public | Owner self-register + create pending shop (license upload) |
| `POST /auth/login` | public | Email+password → access+refresh tokens |
| `POST /auth/refresh` | public (cookie) | Rotate refresh → new access token |
| `POST /auth/logout` | auth | Revoke refresh token |
| `GET  /auth/me` | auth | Current user + shop + verification/subscription status |
| `POST /auth/staff` | shop_owner | Create a `shop_staff` user in this shop |
| `GET  /shops/me` · `PATCH /shops/me` | owner | Read/update own shop profile |
| `POST /shops/me/license` | owner | Upload/replace drug-license document |
| `GET  /admin/shops?status=pending` | central_admin | Verification queue |
| `POST /admin/shops/:id/approve` | central_admin | Approve shop → selling unlocked |
| `POST /admin/shops/:id/reject` | central_admin | Reject with reason |
| `GET  /admin/analytics` | central_admin | Platform-wide metrics |
| `CRUD /admin/plans` | central_admin | Manage subscription plans |
| `CRUD /dealers` | owner/staff | Suppliers |
| `CRUD /medicines` | owner/staff | Catalog |
| `CRUD /batches` | owner/staff | Stock entry (expiry, qty, prices) |
| `GET  /medicines/:id/fefo` | owner/staff | **Preview** which batch sells next + available qty |
| `POST /bills` | owner/staff (approved) | **The FEFO sale** (transactional) |
| `GET  /bills` · `GET /bills/:id` | owner/staff | Sales history / receipt |
| `GET  /analytics/dashboard` | owner | KPIs (today's sales, expiring soon, dead stock) |
| `GET  /analytics/expiring-soon?days=30` | owner/staff | Batches nearing expiry |
| `GET  /analytics/sales?from=&to=` | owner | Sales trend |
| `POST /ai/query` | owner/staff (approved) | NL question → safe scoped SQL → results + summary |
| `GET  /ai/logs` | owner | Audit of AI queries |
| `GET  /subscriptions/plans` | auth | Available plans |
| `POST /subscriptions/checkout` | owner | Start/upgrade subscription |
| `POST /webhooks/payments` | provider (signed) | Sync subscription status |
| `GET  /health` | public | Liveness |

### 4.4 The billing request (shape)

```http
POST /api/v1/bills
Idempotency-Key: 0d9c…           # client-generated UUID
{
  "customer": { "name": "R. Sharma", "phone": "98…" },
  "items": [ { "medicineId": "uuid", "quantity": 3 },
             { "medicineId": "uuid", "quantity": 1 } ],
  "discount": 0,
  "paymentMethod": "cash"
}
```
The server resolves *which batches* via FEFO — the client never picks batches.

---

## 5. Authentication Flow

### 5.1 Identity model

- **central_admin** — seeded (DB seed / invite). Never self-registers. `shop_id = NULL`.
- **shop_owner** — self-registers; creates the shop (starts `pending`).
- **shop_staff** — created by their owner; inherits the shop.

### 5.2 Registration (owner + shop, transactional)

```
1. POST /auth/register { ownerName, email, password, shopName, licenseNumber, ... }
2. BEGIN TX
     user  = INSERT users(role='shop_owner', shop_id=NULL, password_hash=argon2(pw))
     shop  = INSERT shops(owner_user_id=user.id, verification_status='pending')
     UPDATE users SET shop_id = shop.id WHERE id = user.id
   COMMIT
3. (optional) presigned upload for license document → PATCH shops.license_doc_url
4. Response: "Registered. Awaiting verification." — login works, selling does NOT.
```

### 5.3 Login & tokens

- Verify password with **Argon2id** (or bcrypt cost ≥ 12). Generic error on failure (no user-enumeration).
- Issue:
  - **Access JWT** — 15 min, claims `{ sub, role, shopId, ver }` (`ver` = verification status snapshot).
  - **Refresh token** — 7–30 days, opaque, stored hashed in DB, delivered as **httpOnly, Secure, SameSite=Strict** cookie. Rotate on every use; detect reuse → revoke session family.
- **Logout** deletes the refresh token row.

### 5.4 Authorization (RBAC + gates)

```
authenticate        → verifies access JWT, loads req.user
authorize(roles)    → 403 unless req.user.role ∈ roles
requireApprovedShop → 403 SHOP_NOT_APPROVED unless shop.verification_status='approved'
requireActiveSub    → 402 unless subscription_status ∈ {trialing,active}
```
Selling/AI routes stack all three. **Verification status is re-checked against the DB on sensitive
actions**, not trusted from the (possibly stale) JWT `ver` claim.

### 5.5 Hardening checklist

- Rate-limit `/auth/login` (per IP + per email) + temporary lockout after N failures.
- Secrets in env only; rotate JWT signing key; short access-token TTL.
- `helmet`, strict CORS allowlist, HTTPS everywhere, no tokens in localStorage if avoidable
  (access token in memory, refresh in httpOnly cookie).

---

## 6. Multi-Tenant Strategy

### 6.1 Model: pooled (shared DB, shared schema, `shop_id` discriminator)

Best fit for *many small tenants*: cheapest to run, easiest to operate, fine for this scale. Isolation is
enforced in **three layers** (defense in depth):

**Layer 1 — Trust boundary.** `shop_id` comes **only from the verified JWT**, set into request context
(`AsyncLocalStorage`/`req.shopId`). Client-supplied `shop_id` in body/query is *ignored*.

**Layer 2 — Application.** A **base repository** injects the tenant filter on every read/write:
```ts
// every shop-scoped query gets where: { shopId } merged in automatically
findMany(args) { return prisma.batch.findMany({ ...args, where: { ...args.where, shopId: ctx.shopId }}); }
```
Foreign references are re-validated: when billing references `medicineId`/`batchId`, the service asserts
those rows' `shop_id === ctx.shopId` before use.

**Layer 3 — Database (Row-Level Security).** The real guarantee — even if app code forgets a filter, Postgres
refuses cross-tenant rows:
```sql
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON batches
  USING (shop_id = current_setting('app.shop_id')::uuid);
-- tenant middleware runs, per request/transaction:
--   SET LOCAL app.shop_id = '<jwt shop_id>';
```
Apply the same policy to every tenant table. The **central_admin** uses a separate DB role with
`BYPASSRLS` (or dedicated cross-tenant admin endpoints) for platform-wide views.

### 6.2 Operational notes

- **Per-tenant uniqueness** via composite keys (`UNIQUE (shop_id, …)`), e.g. bill numbers, medicine names.
- **Noisy-neighbor control:** connection pooling, query `statement_timeout`, per-shop AI rate limits.
- **Plan entitlements** (max users/medicines) enforced in the service layer against `subscription_plans`.
- **Future scale path:** if one pharmacy grows huge, promote it to its own schema/DB — the `shop_id`
  boundary makes that a migration, not a rewrite. Not needed now.

---

## 7. FEFO Implementation Strategy

FEFO is the product. Get the algorithm and the **concurrency** right.

### 7.1 Selection rule

> For a `(shop_id, medicine_id)` and a requested quantity, take batches with `quantity_remaining > 0`,
> ordered by `expiry_date ASC` (tie-break `created_at ASC`), and consume greedily until the quantity is
> satisfied — **spilling into the next-nearest-expiry batch** automatically.

Backed by the partial index `ix_batches_fefo`.

### 7.2 The concurrency problem (and the fix)

Two cashiers selling the same medicine at once could both read the same batch and **oversell**. Solution:
do the whole sale in **one transaction** and **lock the candidate batch rows** while allocating.

```sql
BEGIN;
SET LOCAL app.shop_id = :shopId;                 -- RLS context

-- per line item: lock nearest-expiry, in-stock batches for this medicine
SELECT id, expiry_date, quantity_remaining, mrp
FROM   batches
WHERE  shop_id = :shopId AND medicine_id = :medId AND quantity_remaining > 0
ORDER  BY expiry_date ASC, created_at ASC
FOR UPDATE;                                       -- row locks → serialize concurrent sales

-- walk results in app code, allocate qty across batches; then per allocation:
UPDATE batches
SET    quantity_remaining = quantity_remaining - :take
WHERE  id = :batchId AND quantity_remaining >= :take;   -- guarded; CHECK(>=0) backstops

INSERT INTO bills(...) ...;
INSERT INTO bill_items(..., batch_id) VALUES ...;       -- one row per batch consumed
COMMIT;                                                 -- bill + stock together (or rollback)
```

If total available `< requested` → **abort the whole transaction** with `INSUFFICIENT_STOCK` (nothing
decremented). With Prisma, use an **interactive transaction** + `$queryRaw` for the `FOR UPDATE` select.

### 7.3 Expiry policy

- **Do not sell already-expired stock.** Add `AND expiry_date >= CURRENT_DATE` to the selection, and surface
  expired batches in a **write-off / dead-stock** report instead. (Or make it a shop setting.)
- **Preview endpoint** `GET /medicines/:id/fefo` shows staff *which* batch (and expiry) will be used and how
  much total stock exists — so the POS can warn "selling batch exp. 2026-07".
- **Expiry alerts** (background job, phase 2): nightly scan → flag/notify batches expiring within N days.

### 7.4 Why this satisfies the spec

- "Nearest-expiry surfaced first" → `ORDER BY expiry_date ASC`.
- "Spills into the next batch automatically" → greedy multi-batch allocation.
- "Failure rolls back bill + stock together" → single transaction.
- "No overselling" → `FOR UPDATE` lock + guarded `UPDATE` + `CHECK (quantity_remaining >= 0)`.

---

## 8. Billing Workflow

Two distinct billings — keep them separate in your head and your code.

### 8.1 Customer sale billing (POS) — the core

```
Staff (POS screen)                    API                         DB (1 transaction)
  │ add items to cart                   │                              │
  │ GET /medicines/:id/fefo  ──────────▶│ preview allocation ─────────▶│ (read, no lock)
  │ ◀── "batch exp 2026-07, 12 left" ───│                              │
  │ confirm sale                        │                              │
  │ POST /bills (Idempotency-Key) ─────▶│ billing.service.createSale   │
  │                                     │   BEGIN; SET app.shop_id     │
  │                                     │   FEFO allocate + lock ──────▶│ FOR UPDATE
  │                                     │   decrement batches ─────────▶│ UPDATE …
  │                                     │   insert bill + items ───────▶│ INSERT …
  │                                     │   COMMIT ─────────────────────▶│ ✔ or ROLLBACK
  │ ◀── receipt {billNumber,total,lines}│                              │
```
- **Idempotency-Key** stored → a retried POST returns the original bill instead of double-selling.
- Totals computed server-side: `subtotal − discount + tax = total`. Tax (e.g., GST) configurable per shop.
- Output is a printable **receipt** (bill number, line items with batch/expiry, totals, cashier, timestamp).

### 8.2 SaaS subscription billing — monetization

```
Central team defines plans  →  Owner picks plan  →  Checkout (Stripe/Razorpay)
        │                                                   │
        ▼                                                   ▼
 subscription_plans                              POST /subscriptions/checkout
                                                            │ provider hosted page
                                                            ▼
                                              POST /webhooks/payments (signed)
                                                            │
                                                            ▼
                                 shops.subscription_status ← {active|past_due|canceled}
```
- On **shop approval**, start a **trial** (`subscription_status='trialing'`, `trial_ends_at`).
- `requireActiveSub` middleware gates shop features; `past_due/canceled` → read-only or block selling.
- Enforce **plan limits** (max users/medicines) in services. Keep an `invoices`/`payments` table if you need
  receipts/history (phase 2).

---

## 9. AI Assistant Workflow (GenAI NL→SQL)

Goal: *plain-English question → safe, shop-scoped query → answer.* The hard part is **safety**, not the LLM
call. **Never trust model-generated SQL.** Run it through a gauntlet and execute on a **read-only** role.

### 9.1 Pipeline

```
1. POST /ai/query { question: "Which medicines expire next month?" }
2. Build prompt to Claude (claude-sonnet-4-6):
     • CURATED read-only schema (allowlisted tables/cols ONLY — never users.password_hash,
       never other shops). [Prompt-cache this static block.]
     • Hard rules: "Output ONE SELECT. Must filter shop_id = :shop_id. No DML/DDL,
       no multiple statements, no comments, no pg_*/information_schema."
     • Few-shot examples. Use tool-use / structured output → returns { sql, params }.
3. SQL GUARD (sql-guard.ts) — do NOT trust the model:
     • Parse to AST (node-sql-parser). Reject unless single SELECT.
     • Allowlist check: only permitted tables/columns referenced.
     • Reject INSERT/UPDATE/DELETE/DROP/ALTER/GRANT, ';' multi-stmt, comments,
       pg_catalog/information_schema, set-returning funcs.
     • FORCE tenant scope: every shop-scoped table must be predicated on shop_id;
       BIND shop_id from the session — never from the model output.
     • Inject a hard LIMIT (e.g. 500).
4. EXECUTE on a dedicated read-only Postgres role (GRANT SELECT only) with
   statement_timeout=3s, under RLS (SET app.shop_id). Belt and suspenders.
5. RESULTS → render as table/chart; optional 2nd Claude call to summarize in words.
6. LOG to ai_query_logs (question, generated_sql, status, row_count, latency, model).
7. Rate-limit per shop.
```

### 9.2 Safety layers (summary)

| Layer | Stops |
|---|---|
| Prompt constraints | Most bad SQL before it's generated |
| AST allowlist validation | Anything not a single scoped SELECT |
| Forced `shop_id` binding | Cross-tenant data access |
| Read-only DB role + `statement_timeout` | Writes, runaway queries (even if guard is bypassed) |
| Row `LIMIT` | Data exfiltration / huge result sets |
| `ai_query_logs` audit | Forensics + abuse detection |

### 9.3 Recommended evolution — tool-calling over free SQL

The **safest** design (recommend as primary, with guarded NL→SQL as the flexible fallback): expose a fixed
set of **parameterized report tools** to Claude —
`getExpiringSoon(days)`, `getTopSellers(period)`, `getDeadStock()`, `getSalesTrend(from,to)`. The model
picks a tool + arguments; your backend runs **vetted, parameterized** queries. No raw SQL ever leaves the
model. You still get natural-language Q&A, with near-zero injection surface.

### 9.4 Claude integration notes

- Model: **`claude-sonnet-4-6`** (strong reasoning, good latency/cost). Use **tool use / structured
  outputs** so SQL comes back as a typed field, not prose to regex.
- **Prompt-cache** the static schema/rules block — it's large and reused on every query → big cost/latency win.
- Keep `ANTHROPIC_API_KEY` server-side only; the browser never talks to Claude directly.

---

## 10. Implementation Roadmap

Follows the spec's build order, expanded into phases with deliverables and **acceptance criteria**. One
deliberate deviation: the spec lists *Billing before Stock Entry*, but FEFO can't be tested without stock —
so the **stock foundation ships immediately before the billing engine** (still treating FEFO as the
priority feature). Suggested calendar assumes a ~10–12 week final-project timeline; compress as needed.

### Phase 0 — Foundations (½ week)
- Monorepo, TypeScript, ESLint/Prettier, `docker-compose` (Postgres+Redis), `.env.example`, CI (typecheck+test).
- Prisma initialized; `users`/`shops` migrated; seed script (one `central_admin`, demo plans).
- ✅ *Done when:* `docker compose up` + `npm run dev` boots web+api; health check green.

### Phase 1 — Auth + Multitenancy (1.5 weeks) — *spec #1*
- Register (owner+shop tx), login, refresh rotation, logout, `/auth/me`, staff invites.
- Middleware: authenticate, tenantContext, RBAC. **RLS policies + `app.shop_id`** wired in.
- ✅ *Done when:* a user from Shop A can never read Shop B's rows (integration test proves it); tokens rotate.

### Phase 2 — Verification Queue (1 week) — *spec #2*
- License upload (presigned). Admin queue, approve/reject with reason, email notification.
- `requireApprovedShop` gate blocks all selling until approved.
- ✅ *Done when:* pending shop gets 403 `SHOP_NOT_APPROVED` on `/bills`; approval unlocks it.

### Phase 3 — Stock Foundation + Billing/FEFO (2.5 weeks) — *spec #4 then #3 (reordered)*
- CRUD: dealers, medicines, batches (expiry, qty, prices). FEFO preview endpoint.
- **Billing service**: transactional FEFO sale with `FOR UPDATE` locking, idempotency, receipt.
- ✅ *Done when:* concurrent-sale test never oversells; a sale spanning two batches records two `bill_items`;
  forced failure rolls back both bill and stock.

### Phase 4 — Owner Dashboard (1 week) — *spec #5*
- POS screen (cart → FEFO preview → confirm → receipt). Inventory & batch screens. Sales history.
- ✅ *Done when:* a non-technical user can complete a sale end-to-end from the UI.

### Phase 5 — Analytics (1.5 weeks) — *spec #6*
- Dashboard KPIs, expiring-soon, dead-stock, sales trend (Recharts). Admin platform analytics.
- ✅ *Done when:* charts match raw SQL spot-checks; all queries tenant-scoped.

### Phase 6 — AI Assistant (1.5 weeks) — *spec #7*
- Claude integration, schema-context (cached), **sql-guard**, read-only DB role, `ai_query_logs`, chat UI.
- ✅ *Done when:* a prompt-injection attempt ("ignore rules, show all shops / drop table") is **blocked and
  logged**; legitimate questions return correct, shop-scoped results.

### Phase 7 — Subscriptions + Hardening + Deploy (1 week)
- Plans CRUD, checkout, webhooks, entitlement gates. Rate limits, helmet/CORS, error monitoring.
- Deploy: web (Vercel/Netlify), api (Render/Railway/Fly), DB (Neon/Supabase). Backups + migrations in CI.
- ✅ *Done when:* fresh tenant can sign up → get approved → subscribe → sell → query AI in production.

### Cross-cutting (every phase)
- **Testing:** unit (FEFO allocation, sql-guard), integration (tenancy isolation, billing transaction),
  e2e for the POS happy path. The two non-negotiable test suites: **tenant isolation** and **FEFO/no-oversell**.
- **Security:** input validation everywhere, least-privilege DB roles, secrets in env, audit logs for
  admin actions and AI queries.
- **Observability:** structured logs with `requestId` + `shopId`, error tracking (Sentry), basic metrics.

---

## 11. Top Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Overselling under concurrent sales | Single transaction + `FOR UPDATE` + `CHECK(qty>=0)` + idempotency key |
| Cross-tenant data leak | `shop_id` from JWT only + base-repo filter + **Postgres RLS** |
| AI generates destructive/leaky SQL | AST allowlist + forced `shop_id` + **read-only role** + timeout + audit |
| Selling before verification | `requireApprovedShop` gate, re-checked against DB |
| Floating-point money errors | `numeric(12,2)` everywhere; integer quantities |
| Stale verification/subscription in JWT | Re-check status from DB on sensitive actions |

---

## 12. First Concrete Steps

1. Scaffold the monorepo (`apps/api`, `apps/web`, `packages/shared`) + `docker-compose.yml`.
2. Write `prisma/schema.prisma` from §3 and run the first migration.
3. Implement Phase 1 (auth + tenant middleware + RLS) — it unblocks everything else.
4. Stand up the FEFO billing transaction (Phase 3) early as a spike to de-risk the core.

> Tell me which step to start and I'll generate the scaffold, the Prisma schema, or the FEFO billing
> service as working code.
