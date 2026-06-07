# Stock Easy — Implementation Report: AI Assistant + KYC Onboarding

> Scope of this report: the **AI Assistant conversational enhancements** and the **KYC registration + secure
> document management** package. The four earlier enhancements — professional invoice printing, bill search,
> FEFO-in-POS recommendations, and shop approval gating — were completed and verified in a prior session and
> remain intact (proven by the unchanged passing test suite and green builds below).
>
> Every claim here is backed by code inspection, build output, or test results captured during implementation.

---

## 0. Verification summary (evidence first)

| Check | Command | Result |
|---|---|---|
| API typecheck | `npm run typecheck` (apps/api) | **Pass** — no errors |
| Web typecheck | `npm run typecheck` (apps/web) | **Pass** — no errors |
| API production build | `npm run build` (apps/api, `tsc`) | **Pass** |
| Web production build | `npm run build` (apps/web, `next build`) | **Pass** — 22 routes generated |
| Prisma schema validation | `npx prisma validate` | **`valid 🚀`** |
| Migrations apply | `prisma migrate deploy` (test harness) | **4/4 applied** incl. `20260607130000_shop_kyc_documents` |
| Integration tests | `npm test` (apps/api, vitest) | **37 passed / 37** (7 files) |
| Adversarial security review | 5-lens workflow over the diff | **0 critical, 0 high**; 1 medium + lows found and **fixed** |

Test breakdown: `tenant-isolation` (5), `returns-voids` (4), `fefo` (4), `money` (7), `idempotency` (3),
`concurrency` (2), **`kyc-documents` (12, new)** = 37.

---

## 1. What was built

### 1.1 AI Assistant — conversational upgrade
The chat UI and free-text questions **already existed** (`ai-assistant.tsx` had a message thread, composer,
Enter-to-send, retry, suggestion chips; `/ai/query` already accepts arbitrary natural language via Gemini
function-calling). Rather than rebuild, this work **extended** it:

- **Multi-turn context** — follow-up questions ("what about 60 days?") now resolve. The request optionally
  carries recent `history`; the Gemini provider threads it into the `contents` array.
- **Persistent history** — the conversation is saved to `localStorage`, **keyed by the authenticated user
  id**, and restored on refresh (survives reloads/navigation).
- **Clear + retry** — a "Clear chat" control and per-turn retry.
- **Persistent quick-actions** — predefined prompts remain one tap away **after** the conversation starts
  (a quick-action strip above the composer), not only in the empty state.
- **Graceful unavailability** — per-turn error bubble + retry; friendly fallback copy; the composer stays
  usable; missing `GEMINI_API_KEY` returns a clean 503 (unchanged).

### 1.2 KYC registration + secure document management
- **Registration** now collects business + KYC details: address, **city, state, postal code**, GST (optional),
  **Aadhaar**, **PAN** (license number already existed).
- **Secure documents** — Aadhaar / PAN / license / GST files are uploaded **after sign-up** (from the
  approval-pending screen and Settings), stored **in Postgres as `bytea`** (no third-party storage), and
  served only through **authenticated, RBAC-gated, tenant-scoped** endpoints. Validation covers size, MIME
  allowlist, and **magic-byte signature** matching.
- **Admin review** — central admins get a "Review" dialog showing the full business profile, a
  **reveal-toggle** for Aadhaar/PAN, and **view/download** of each uploaded document, with Approve/Reject in
  place.
- **Privacy** — Aadhaar/PAN are **masked everywhere outside the central-admin path** (owner *and* staff see
  `XXXX XXXX 1234`); on owner edit they are **write-only** (never re-echoed, so a save can't corrupt them).

---

## 2. Database changes (additive only)

Migration `apps/api/prisma/migrations/20260607130000_shop_kyc_documents/migration.sql`:

```sql
ALTER TABLE "shops"
    ADD COLUMN "city" TEXT, ADD COLUMN "state" TEXT, ADD COLUMN "postal_code" TEXT,
    ADD COLUMN "aadhaar_number" TEXT, ADD COLUMN "pan_number" TEXT;          -- all nullable

CREATE TYPE "document_kind" AS ENUM ('aadhaar','pan','license','gst','other');

CREATE TABLE "shop_documents" (
    id uuid PK, shop_id uuid NOT NULL, kind document_kind NOT NULL,
    original_name text, mime_type text, byte_size int, data BYTEA NOT NULL,
    uploaded_by uuid, created_at/updated_at timestamptz );
-- FKs: shop_id → shops ON DELETE CASCADE, uploaded_by → users ON DELETE SET NULL
-- Indexes: (shop_id), (shop_id, kind); CHECK (byte_size > 0)
```

Prisma models: `Shop` gained the 5 nullable KYC columns + a `documents ShopDocument[]` relation; new
`ShopDocument` model (`data Bytes` → `bytea`) and `DocumentKind` enum; `User` gained
`uploadedDocuments ShopDocument[]`. Backward compatibility: every column is nullable; the new table is new;
existing rows and queries are unaffected. **No breaking change.** (`gstNumber` already existed from a prior
migration.)

> **Design note (why DB bytea, not S3/R2):** the platform targets free-tier Neon Postgres + Render (ephemeral
> FS) and has *no* existing object store. Storing bytes in Postgres needs zero new infra, survives Render
> redeploys, and keeps every document behind an authenticated API route (no public URLs) — directly serving
> the security requirement. The storage is isolated behind the repository, so swapping to S3/R2 later is a
> localized change.

---

## 3. API changes

| Method & Path | Role | Purpose |
|---|---|---|
| `POST /auth/register` | public | Now requires KYC fields (address/city/state/postalCode/Aadhaar/PAN; GST optional) |
| `GET /shops/me/documents` | shop_owner | List own document metadata (never bytes) |
| `POST /shops/me/documents` | shop_owner | Upload a base64 document (size/MIME/magic-byte validated) |
| `GET /shops/me/documents/:id` | shop_owner | Stream own document bytes (tenant-scoped) |
| `DELETE /shops/me/documents/:id` | shop_owner | Delete own document |
| `GET /admin/shops/:id/documents` | central_admin | List a shop's documents for review |
| `GET /admin/shops/:id/documents/:docId` | central_admin | Stream a document (scoped by **both** ids) |
| `PATCH /shops/me` | shop_owner | Extended with city/state/postalCode/Aadhaar/PAN (write-only) |
| `POST /ai/query` | owner/staff (approved) | Now accepts optional `history` for multi-turn context |

Cross-cutting:
- **Masking** applied in `shopService.getMyShop/updateMyShop/setLicense` and the shop embedded in
  `authService.me()` — i.e. **all** owner/staff-facing shop responses (`apps/api/src/utils/kyc.ts:maskShop`).
- **Body-limit isolation** (`apps/api/src/app.ts`): the global parser stays a tight **1 MB**; only
  `POST /api/v1/shops/me/documents` bypasses it to a route-local `express.json({ limit: '8mb' })`. This is
  fail-closed — every other route keeps the 1 MB cap (a global parser would otherwise consume the body first).

---

## 4. Frontend changes

- **Registration** (`features/auth/register-form.tsx`, `validators.ts`, `hooks.ts`, `types/auth.ts`): new KYC
  fields with client validation matching the server (Aadhaar 12 digits, PAN format, PIN 6 digits; Aadhaar
  whitespace stripped to match the API).
- **Reusable documents manager** (`features/settings/kyc-documents.tsx`): file picker → client validation
  (size + magic-byte sniff) → base64 upload; list with **authenticated view** (`responseType: 'blob'` →
  object URL, always revoked) and delete. Used in **Settings** *and* the **approval-pending** screen.
- **Settings** (`features/settings/settings-view.tsx`): city/state/postalCode inputs + **write-only**
  Aadhaar/PAN inputs (current value shown masked as a hint; blank = keep) + the documents card.
- **Admin review** (`features/admin/review-kyc-dialog.tsx` + table "Review" action, wired into Approvals and
  Tenants): profile fields, reveal-toggle for Aadhaar/PAN, document view/download, Approve/Reject.
- **AI** (`features/ai/ai-assistant.tsx`, `storage.ts`, `hooks.ts`, `services/ai.service.ts`,
  `types.ts`): persistence keyed by user, multi-turn history, persistent suggestions, clear-chat; cleared on
  sign-out (`providers/auth-provider.tsx`).
- **Shared types/services**: `Shop` gained the KYC fields + `ShopDocument`/`DocumentKind`; `shops.service` and
  `admin.service` gained document operations; `lib/documents.ts` centralizes limits, kinds, base64, and
  client-side sniffing.

---

## 5. Security & privacy model (verified by the adversarial review)

| Control | Implementation | Verified |
|---|---|---|
| **Aadhaar/PAN masking** | `maskShop()` on all owner/staff paths (`/shops/me`, `/auth/me`); admin path intentionally unmasked | Lens "PII masking": complete; no staff leak |
| **Write-only KYC edit** | Settings inputs default empty; only sent when typed → masked value can't overwrite real value | Lens "compat-frontend": confirmed |
| **Upload validation** | order: empty → **size (server-enforced)** → **magic-byte sniff** → declared-MIME match; stored MIME is the *sniffed* value | Lens "upload-security": correct |
| **No public document URLs** | bytes served only via authenticated routes; `Content-Disposition` filename sanitized (control/quote/backslash stripped) | Verified both shop + admin paths |
| **Owner-only documents** | doc routes use `authorize(shop_owner)` (no `shop_staff`); every query scoped by `getShopId()` (from JWT) | Lens "authz-tenant": staff get 403; no cross-shop read |
| **Admin scoping** | `/admin/*` is `central_admin`-only; download scoped by **both** `:id` and `:docId` (mismatch → 404) | Lens "authz-tenant": no cross-tenant leak |
| **Tenant isolation** | `findDocument(shopId, id)`, `deleteDocument(shopId, id)` filter by `shopId` | Test: shop B cannot read/delete shop A docs |
| **AI sandbox preserved** | `shopId` injected server-side; history is text-only and never reaches `runTool`; fixed 5-tool registry | Lens "ai-multiturn": cannot change tenant/escape tools |
| **No key exposure** | `GEMINI_API_KEY` is server-only (never `NEXT_PUBLIC_*`) | Verified |
| **Storage-abuse cap** | `MAX_DOCS_PER_SHOP = 12` enforced before insert (pre-approval endpoint) | Test: 13th upload rejected |
| **Body-limit DoS** | global 1 MB; only the one upload route raised, fail-closed | Lens "upload-security": correct |

### Review findings → resolution
The 5-lens adversarial review returned **0 critical / 0 high**. Resolved items:
1. *(medium)* No per-shop document cap → added `MAX_DOCS_PER_SHOP` check (+ test).
2. *(low)* Trailing-slash bypassed the body-limit exemption → path normalized in `app.ts`.
3. *(low)* Filename sanitizer missed some control chars → shared `safeFilename()` now strips `\x00-\x1f\x7f"\\`.
4. *(low)* AI chat persisted after logout → cleared in `clearSession()` (privacy on shared devices).
5. *(low)* Restored chat turns weren't shape-validated → strict per-entry guard added.
6. *(low)* Web Aadhaar regex rejected spaced input the API accepts → web validators now strip spaces.
7. *(low)* No feedback if a popup blocker stopped document view → toast added.

Accepted-as-designed (documented, not changed): the central-admin shop **list** returns full Aadhaar/PAN
(needed to review KYC; the route is `central_admin`-only and the UI masks by default with a reveal toggle).
Optional future hardening: a dedicated on-demand reveal endpoint instead of returning raw values in the list.

---

## 6. Authorization model (RBAC)

- `central_admin` — no shop; full access to `/admin/*` including document review/download; **cannot** be a
  shop member.
- `shop_owner` — manages own shop + KYC; **only** role that can upload/view/delete own documents and edit KYC.
- `shop_staff` — operational access (when approved) but **403 on all KYC/document routes** and KYC values are
  masked in every response they can read.
- Trust boundary unchanged: `shopId` always comes from the verified JWT (`getShopId`), never from
  body/query.

---

## 7. Testing results

`apps/api/tests/integration/kyc-documents.test.ts` (12 tests, all passing) exercises:
masking (`maskAadhaar`/`maskPan`/`maskShop` incl. relation preservation); `getMyShop` masks while the DB keeps
the full value; upload stores metadata (no bytes) and round-trips the exact bytes on download; PDF accepted;
**MIME-mismatch rejected**; **unsupported file rejected**; **oversize rejected**; **tenant isolation** (shop B
cannot read/delete shop A docs, sees an empty list); **admin** can review/download scoped by shop id (wrong id
→ 404); **rejected→pending re-open** on re-upload; **per-shop cap** enforced. The 25 pre-existing tests
(tenant isolation, FEFO, concurrency/no-oversell, idempotency, returns/voids, money/GST) still pass —
**regression-free**.

---

## 8. Deployment impact

- **Migration**: run `prisma migrate deploy` (additive, safe on a populated DB). `prisma generate` runs in the
  existing build.
- **No new env vars, no new dependencies, no external services.** Files live in Neon Postgres (`bytea`).
- **Sizing**: each KYC doc ≤ 5 MB, ≤ 12 per shop. Watch Neon storage if tenant count grows large; the
  repository abstraction makes a later move to S3/R2 a localized change.
- **Test harness**: `tests/setup/global-setup.ts` already pins `DIRECT_URL` to the ephemeral test DB (fixed in
  the prior session), so CI runs hermetically and never touches production.
- Frontend redeploy picks up the new register/settings/admin/AI UI automatically.

---

## 9. Remaining recommendations (optional)

1. **On-demand admin reveal endpoint** for Aadhaar/PAN instead of returning raw values in the admin list
   (defense-in-depth).
2. **Encryption-at-rest for KYC identifiers** (app-level envelope encryption of `aadhaar_number`/`pan_number`)
   if compliance requires more than Neon's at-rest encryption.
3. **AI rate limiting per-shop** — `aiLimiter` is currently per-IP; a per-shop key would be fairer for tenants
   behind shared NAT.
4. **Server-side conversation history** (a table) if cross-device chat continuity is desired later — the
   current client persistence is intentionally lightweight.
5. **Background virus scanning** of uploaded documents if the threat model expands (magic-byte validation
   guards format, not malware).
```
