# Stock Easy Backend — Production Code Audit

> Reviewer role: senior staff engineer. Scope: `apps/api` (89 TS files). Stance: deliberately critical.
> Verdict up front: **strong scaffold, NOT production-ready.** Readiness **6.0 / 10** — gated by an
> untested money/stock path, no idempotency, and a handful of security-hardening gaps.

---

## 0. Methodology — what was actually verified (not just eyeballed)

| Check | Tool | Result |
|---|---|---|
| Compilation | `tsc --noEmit` | **0 errors** |
| Circular dependencies | `madge --circular` (89 files) | **None** |
| Decimal JSON serialization | `node` + `@prisma/client` | Serializes to **string** (`1.50`→`"1.5"`) |
| Tenant scoping | grep every `prisma.<model>.<op>` | All tenant tables carry `shopId`; cross-tenant only in `admin` |
| SQL injection surface | grep `$queryRaw*/$executeRaw*` | All **parameterized**; zero `Unsafe` variants |
| `req.query` reassignment | live Express 4.22 test | Works (would throw on Express 5) |
| Type-safety escapes | grep `as any / as unknown as` | 11 `as unknown as` (all `req.query` casts, validation-backed) |

**Caveat that colours everything below:** there is no Postgres in this environment, so the FEFO billing
transaction (advisory lock + `FOR UPDATE` + raw decrements) has been **type-checked and logically reviewed
but never executed against a real database.** For code that moves money and stock, that is the single
biggest gap.

---

## 1. Verified-good (won't be re-litigated)

- Clean layering, **no circular dependencies**, modules isolated.
- **Multi-tenancy app-layer scoping is consistent** — no unscoped tenant query found.
- **No SQL injection** — raw SQL is parameterized tagged templates only.
- **Decimal money serializes as strings** (no float corruption, no `{s,e,d}` objects).
- **AI is injection-proof by construction** — tool-calling over 5 fixed reports; `shopId` server-injected;
  the model never emits SQL.
- Structured logging with correlation id; consistent error envelope; env validated at boot.

---

## 2. Findings by category

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

### 2.1 Compilation issues — **none**
`tsc --noEmit` is clean. The only nit: validated request data is not *typed* through the boundary (see 2.4).

### 2.2 Runtime issues
- 🟠 **Interactive transaction holds a pooled connection while blocking on the advisory lock.**
  `billing/service.ts:23` calls `prisma.$transaction(async (tx) => …)` with **no options**, then
  `acquireShopLock` blocks *inside* the transaction. Under concurrent sales in one shop, queued sales hold
  connections while waiting → **connection-pool exhaustion** and **`P2028` timeouts** (default `timeout`
  5 s). Fix: shorten the critical section, raise `timeout`/`maxWait` deliberately, or acquire the lock
  with a bounded `pg_try_advisory_xact_lock` + retry.
- 🟡 **Preview vs. sale use different "today".** `batches/repository.findSellable` filters
  `expiryDate >= startOfToday()` (JS, server local tz); the sale lock uses `expiry_date >= CURRENT_DATE`
  (Postgres session tz). Near midnight / across tz they can disagree, so a preview can show a batch the sale
  then refuses (or vice-versa). Pick one clock (preferably DB `CURRENT_DATE`).
- 🟢 **Decimal trailing zeros dropped** in responses (`1.50`→`"1.5"`). Not a bug, but the client must format
  money; document it or normalize server-side.
- 🟢 **Forward-incompat:** `validate` reassigns `req.query`; fine on the pinned Express 4.22, **throws on
  Express 5** (read-only getter).

### 2.3 Security vulnerabilities
- 🟠 **Unsafe default CORS.** `config/env.ts` defaults `CORS_ORIGIN='*'`; `app.ts` then sets
  `origin: true, credentials: true` — i.e. **reflect any origin and allow credentials**. Mitigated today by
  `SameSite=Strict` refresh cookie + access-token-in-header, but it is a footgun and must never reach prod.
  Fix: require an explicit origin allowlist; refuse to boot with `*` + credentials in production.
- 🟡 **Login user-enumeration via timing.** `auth/service.login` short-circuits
  `if (!user || … || !(await verifyPassword(...)))` — when the email doesn't exist, **bcrypt never runs**,
  so "no such user" returns measurably faster. Fix: always run a dummy `verifyPassword` against a constant
  hash.
- 🟡 **Refresh-token reuse not detected + concurrent-refresh race.** `auth/service.refresh` revokes the
  presented token and issues a new pair, but (a) two concurrent calls with the *same* token both read it as
  active before either revokes → **one refresh token spends twice**; (b) replay of an already-rotated token
  just 401s — it does **not** revoke the session family or flag a breach (the architecture claimed it did).
  Fix: rotate inside a transaction with a conditional `updateMany(... revokedAt: null)` and treat a 0-row
  result / reuse as "revoke all sessions for this user".
- 🟡 **`SameSite=Strict` refresh cookie breaks split-host deploys.** If web and API live on different
  registrable domains (e.g. `*.vercel.app` + `*.onrender.com`), the refresh cookie is never sent → silent
  logout loop. Fix: `SameSite=None; Secure` for cross-site, or host under one parent domain.
- 🟢 Error envelope leaks raw Prisma codes (`PRISMA_P2002`) — minor info disclosure.
- 🟢 No per-account lockout (only a 20/15 min IP limiter); no password-reset/email-verification (out of
  scaffold scope, but required before real users).
- ℹ️ **Data egress:** the AI assistant ships shop analytics (medicine names, sales) to Google (Gemini API). For a
  pharmacy this is a data-governance decision that needs an explicit sign-off / DPA.

### 2.4 Missing imports — **none**
`tsc` would have failed; it didn't. But: **11 `req.query as unknown as T` casts** (e.g.
`dealers/controller.ts:9`) launder `unknown` into typed query objects. They're safe *only because* each
route has a matching `validate({ query })`. Remove a validator and the cast lies silently. Fix: thread
validated data through typed `res.locals`/a generic, instead of re-casting `req.query`.

### 2.5 Circular dependencies — **none** (madge, 89 files). Cross-module imports are acyclic
(`batches→{medicines,dealers}`, `billing→batches/fefo`, `ai→analytics`, `admin/subscriptions→shops`).

### 2.6 Multi-tenancy vulnerabilities
- 🟡 **Isolation is app-discipline only; RLS ships but is off by default.** Every repo is scoped today, but
  one forgotten `where shopId` = cross-tenant leak with no backstop. `prisma/rls.sql` exists — it should be
  applied, and `billing.setTenant` already sets `app.current_shop_id`, so finish the job for all routes.
- 🟢 **`shopRepository.update({ where: { id } })` is a sharp primitive** — correct only because every caller
  passes a token-derived `shopId` (or is admin). One careless future caller = IDOR. Consider a
  `updateOwn(shopId, …)` shape.
- 🟢 **Medicine uniqueness with NULL `strength`/`form`** lets duplicate catalog rows exist (Postgres treats
  NULLs as distinct). Use `NULLS NOT DISTINCT` or default empty strings.

### 2.7 FEFO edge cases
- 🔴/verification — **the FEFO transaction has never run against a database.** Locking, `FOR UPDATE`, the
  advisory lock, and the guarded decrement are unproven. This must be integration-tested before launch.
- ✅ Correct by inspection: duplicate medicine lines are summed (`demand` Map) so each medicine is locked
  once; multi-batch spill works; expired stock excluded; total-shortfall aborts the whole tx.
- 🟡 Expired-but-in-stock is silently unsellable — surfaced only via `dead_stock`. Confirm staff have a
  write-off path (today there is none).
- 🟢 The advisory lock already serializes a shop's sales, so the per-row `FOR UPDATE` is redundant (belt &
  suspenders, not a bug).

### 2.8 Billing edge cases
- 🟠 **No idempotency.** `POST /bills` is not idempotent; a double-click or network retry = **double sale,
  double stock decrement**. For a POS this is a when-not-if incident. Fix: `Idempotency-Key` header + a
  unique-keyed store (small table) returning the original bill on replay.
- 🟡 **No returns / void.** Bills are immutable with no reversal endpoint, so a mis-sale can't restore
  stock. Needs a compensating "return" flow.
- 🟡 **`bill_number` via `MAX()+1`** is correct *only* under the advisory lock; if the lock is ever removed
  for throughput, concurrent sales collide on `UNIQUE(shop_id, bill_number)`. Document the coupling or move
  to a per-shop sequence/counter table.
- 🟢 **Discount/tax not rounded to 2dp** — `new Prisma.Decimal(3.999)` into `numeric(12,2)` rounds silently
  in the DB; validate/round at the boundary.

### 2.9 AI module vulnerabilities
- ✅ Safe by design (tool-calling, server-injected `shopId`, zod-clamped args, read-only reports).
- 🟢 **Cost controls are per-IP, not per-tenant.** `aiLimiter` keys on IP → many shops behind one NAT share
  the budget; one shop across many IPs evades it. Key the limiter on `shopId`.
- ✅ The two Gemini calls now run under an explicit 25s `AbortSignal.timeout` so a hang cannot tie up a
  request slot. A per-tenant retry budget is still future work.

### 2.10 Performance bottlenecks
- 🟠 **Per-shop sale serialization.** The advisory lock means a shop processes sales strictly one-at-a-time.
  Fine for a small pharmacy; a real ceiling for multi-terminal/high-volume, and it compounds the pool/timeout
  risk in 2.2.
- 🟡 **`requireApprovedShop` adds a DB round-trip to every sale/AI call.** Acceptable, but cache the status
  (short TTL) or fold a verified flag into a short-lived token if it shows up in profiles.
- 🟢 **Offset pagination** (`skip/take`) degrades on deep pages; switch to keyset for large datasets.
- 🟢 `/health` does not check the database — it returns 200 even if Postgres is down (bad for LB health).

---

## 3. Architecture review

**Strengths.** Textbook modular monolith: one-way dependency flow (route→controller→service→repository→DB),
controllers free of Prisma, services free of `req/res`, cross-cutting concerns in middleware, zero cycles.
The repository layer's tenant-scoping convention is the right backbone for this SaaS. FEFO is correctly
isolated into a pure `allocateFefo` reused by preview and sale.

**Gaps.** (1) The **transaction boundary owns too much wall-clock time** (external-lock wait inside the
interactive tx). (2) **No domain/service-level invariants are enforced at the DB tenancy layer** (RLS off).
(3) **No entitlement layer** — `subscription_status` and plan limits (`maxUsers`/`maxMedicines`) are stored
but never enforced; a canceled shop sells freely. (4) **No outbox/audit for stock movements** beyond the
bill itself, so corrections/returns have nowhere to live.

---

## 4. Risk report (prioritized)

| # | Risk | Sev | Likelihood | Blast radius | Fix effort |
|---|---|---|---|---|---|
| R1 | FEFO/billing path never run against a DB; no tests | 🔴 | High | Wrong stock/money | M (spin PG + 2 suites) |
| R2 | No billing idempotency → duplicate sales | 🟠 | High | Money + stock | S–M |
| R3 | Tx holds connection on advisory-lock wait → pool exhaustion / P2028 | 🟠 | Med (under load) | API-wide outage | M |
| R4 | Default `CORS_ORIGIN='*'` + credentials | 🟠 | Med (misconfig) | Credential exposure | S |
| R5 | No subscription/entitlement enforcement | 🟠 | High | Revenue leak | S–M |
| R6 | Login timing user-enumeration | 🟡 | Med | Recon | S |
| R7 | Refresh reuse/race, no family revocation | 🟡 | Low–Med | Session integrity | S–M |
| R8 | RLS not enabled (app-discipline-only tenancy) | 🟡 | Low now/High over time | Cross-tenant leak | M |
| R9 | SameSite=Strict breaks split-host deploy | 🟡 | Med | Auth unusable | S |
| R10 | No returns/void; irreversible sales | 🟡 | Med | Stock drift | M |

---

## 5. Code quality report

**Good:** consistent module shape, small focused functions, explicit error types, no dead code, no `any`,
sensible names, comments explain *why*. Validation centralized; envelopes uniform.

**Improve:**
- Replace the 11 `req.query as unknown as T` casts with a typed-validation pattern (latent-bug surface).
- `jwt.verify` result is cast, not schema-checked — zod-parse the claims for a malformed-token backstop.
- Repository `update`/`remove` return `null` on miss and services translate to 404 — consistent, but the
  pattern is duplicated 4×; a small generic `TenantRepository<T>` base would DRY it.
- No tests at all (0% coverage). For a money system this is the dominant quality gap.
- Magic-ish constants (trial days, limits) are centralized — good — but tax/discount handling lacks a money
  abstraction (round-half-even, currency).

**Metrics:** 89 files · 0 tsc errors · 0 circular deps · 0 unsafe SQL · ~0 `any`. Static quality is high;
*verification* quality is low.

---

## 6. Production readiness score

| Dimension | Score | Notes |
|---|---|---|
| Architecture & structure | 8.5 | Clean, modular, acyclic |
| Compilation & type safety | 8.0 | Compiles; query casts dock it |
| Security | 6.0 | Basics solid; CORS default, login timing, refresh, entitlements |
| Multi-tenancy | 7.5 | Consistent app-layer; RLS off by default |
| Correctness (FEFO/billing) | 5.5 | Sound design, **unverified**, no idempotency |
| Reliability & performance | 5.5 | Advisory-lock serialization, pool/timeout risk |
| Testing & verification | 2.0 | No tests; critical path never run on a DB |
| Observability & ops | 6.0 | Good logs; shallow health, no metrics |

### **Overall: 6.0 / 10 — NOT production-ready (strong scaffold).**

Rationale: the structure is genuinely good and would pass a design review. But this system moves **money and
regulated stock**, and the path that does so is **untested against a database, non-idempotent, and
serialized in a way that can exhaust connections under load**, on top of a few security defaults that must
not ship. Close R1–R5 and this is a credible **~8/10**.

---

## 7. Remediation plan

**Before building the frontend (cheap, prevents rework / contract churn):**
1. R4 — make `CORS_ORIGIN` mandatory; forbid `*`+credentials in prod.
2. R2 — add `Idempotency-Key` to `POST /bills` (frontend will depend on the contract).
3. Decide money-string formatting + the returns/void contract now (2.8/R10) so the UI is built against it.
4. R6 — constant-time login.

**Before any production / real data:**
5. R1 — stand up Postgres in CI; write the two non-negotiable suites: **tenant isolation** and **FEFO
   no-oversell under concurrency** (the suites the architecture itself named).
6. R3 — bound the sale transaction (shorten critical section; explicit `timeout`/`maxWait`; consider
   `pg_try_advisory_xact_lock` + retry).
7. R8 — apply `prisma/rls.sql` and run the app under a non-owner role.
8. R5/R7/R9 — entitlement gate, refresh-reuse handling, cross-site cookie strategy.
9. Ops — deep `/health` (DB ping), per-tenant AI rate limit, metrics.
