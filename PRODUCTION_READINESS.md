# Stock Easy — Production Readiness Report (Web Client)

**Date:** 2026-06-04 · **Scope:** `apps/web` (Next.js 15 / React 19) hardening, performance,
security, accessibility. **Constraint honored:** no backend business logic, schema, auth flows,
API contracts, analytics formulas, FEFO logic, or routing architecture were modified.

**Method — evidence-based only.** Every claim below is backed by a production build, runtime
header inspection, bundle metrics, a client-bundle secret scan, console/network capture, or a
runtime accessibility probe. Commands + outputs are summarized in §5.

---

## Executive summary

The web client was already well-engineered (in-memory access tokens, httpOnly-cookie refresh,
typed API layer, dev-gated devtools, validated env, lean 102 kB shared JS baseline). This pass
closed the remaining production gaps and verified the result at runtime:

| Area | Result |
| --- | --- |
| Security headers | Full suite added + **verified live** (CSP, HSTS, X-Frame-Options, X-CTO, Referrer-Policy, Permissions-Policy, COOP, CORP); `X-Powered-By` removed |
| Dependency vulns | 2 moderate → **0** (`npm audit` clean) via a safe `postcss` override (no Next downgrade) |
| Secret exposure | **PASS** — 0 server secrets in the client bundle (76 files scanned) |
| Performance | Recharts code-split → **−37% First-Load JS** on the 3 chart routes, no behavior change |
| Accessibility | Dialog description gaps fixed; nav drawer now exposes `aria-describedby` (verified) |
| Build | `next build` green: 22 routes, TS + lint pass |
| Lighthouse (`/login`, prod) | **Performance 94 · Accessibility 95 · Best Practices 96 · SEO 100** |

**Overall:** the web client is **production-ready**, pending the operational follow-ups in §6
(rotate the Gemini key, set HTTPS-only cookie flags, point CORS at the deployed origin).

---

## 1. Security & production-readiness

### 1.1 Findings
- **No security headers** were emitted (no CSP, HSTS, framing/MIME protections).
- **`X-Powered-By: Next.js`** advertised the framework.
- **2 moderate dependency vulnerabilities** — `postcss <8.5.10` (XSS via unescaped `</style>` in
  CSS stringify), pulled in transitively under `next`. npm's `--force` "fix" wanted to downgrade
  Next to v9 (unacceptable).
- **A real Gemini API key is committed in `apps/api/.env`** (a gitignored dev file).

### 1.2 Fixes applied — verified at runtime
**Security headers** (`apps/web/next.config.mjs`, applied to `/:path*`). Confirmed via
`Invoke-WebRequest http://localhost:3000/login` against the production server:

| Header | Value (verified) |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:4000; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `X-DNS-Prefetch-Control` | `on` |
| `X-Powered-By` | **absent** (`poweredByHeader: false`) |

CSP design notes (verified compatible — app loads, login works, charts render, **0 CSP
violations** in console):
- `connect-src` is **derived from `NEXT_PUBLIC_API_URL`** at config load, so it stays correct
  across local/staging/prod without hand-editing (auth uses cross-site cookies → API may be a
  different origin).
- `'unsafe-eval'` and the HMR `ws:` are **scoped to development only** (confirmed: the production
  CSP contains neither). `'unsafe-inline'` remains required for Next's inline bootstrap + injected
  styles absent a nonce middleware (see §6).
- **Cross-Origin-Embedder-Policy intentionally omitted** — the app needs no cross-origin
  isolation (no `SharedArrayBuffer`/wasm threads); `require-corp` would risk breaking legitimate
  loads for no benefit.

**Dependency vulnerability** — added `"overrides": { "postcss": "^8.5.10" }` (and bumped the
direct devDependency) in `apps/web/package.json`. After `npm install`, **`npm audit` reports
`found 0 vulnerabilities`**, with Next untouched at 15.5.x.

**Build-time secret leakage** — scanned all 76 client JS files in `.next/static`:
- **PASS:** no Gemini key, `GEMINI_API_KEY`, or JWT-secret strings present.
- Sanity check: the *public* `NEXT_PUBLIC_API_URL` value (`localhost:4000`) appears in 5 chunks —
  confirming the scan reads real bundle content (so the "no secrets" result is trustworthy).

### 1.3 Existing strengths (verified, unchanged)
- **Access token in memory only** (`services/api/token-store.ts`) — never `localStorage`
  (XSS hardening); session restored on reload via the **httpOnly refresh cookie** with
  single-flight 401 renewal (`services/api/client.ts`).
- **Env validated** in one place (`lib/env.ts`); only `NEXT_PUBLIC_*` (non-sensitive) reach the client.
- **TanStack Query devtools dev-gated** (`process.env.NODE_ENV === "development"`) — confirmed
  absent from the production render (no dev overlays in prod screenshots).

### 1.4 Remaining recommendations
- **Rotate the Gemini key** and inject it via a secret manager / runtime env in production; never commit it.
- In production set the refresh cookie `SameSite=None; Secure` over HTTPS (API side) and set the
  API `CORS_ORIGIN` to the deployed web origin (CORS rejects `*`).
- Optional: a **nonce-based CSP** (Next middleware) to drop `'unsafe-inline'` from `script-src`.
- HSTS/`Secure` cookies require HTTPS termination in front of the app (harmless on local http).

---

## 2. Performance

### 2.1 Production bundle analysis (`next build`)
Shared First-Load JS baseline is a lean **102 kB**. The heaviest routes were exactly the three
that render **Recharts** — the single large client dependency (only 3 files import it).

### 2.2 Optimization — code-split Recharts
The Recharts chart bodies were moved into sibling modules loaded via
`next/dynamic(() => import(...), { ssr: false, loading: <Skeleton/> })`, behind the **skeletons
that already existed**. No data flow, props, or visual output changed.
Files: `dashboard/top-medicines-chart{,-inner}.tsx`, `analytics/analytics-view.tsx` +
`analytics-top-chart.tsx`, `admin/platform-analytics.tsx` + `platform-analytics-chart.tsx`.

| Route | First-Load JS before | after | Δ |
| --- | --- | --- | --- |
| `/dashboard` | 267 kB | **168 kB** | −99 kB (−37%) |
| `/analytics` | 264 kB | **165 kB** | −99 kB (−38%) |
| `/admin/analytics` | 275 kB | **174 kB** | −101 kB (−37%) |

**Verified no regression:** in the production build the dashboard chart (`SvgRoot`) renders on
desktop and mobile, and `/analytics` shows 2 Recharts containers; consoles are clean. Charts now
load on demand behind their skeletons.

### 2.3 Route metrics (post-optimization, `next build`)
Shared baseline **102 kB**; representative routes: `/login` 175 kB · `/pos` 205 kB ·
`/medicines` 232 kB · `/bills` 166 kB · `/dashboard` 168 kB · `/analytics` 165 kB ·
`/admin/analytics` 174 kB. All route shells are statically prerendered (`○`); detail routes
(`/bills/[id]`, `/medicines/[id]`, `/dealers/[id]`) are dynamic (`ƒ`).

### 2.4 Lighthouse (production `/login`)
A Lighthouse 12 audit was run against the **production** server (`next start`) for the only
unauthenticated route, `/login`. (Authenticated routes can't be scored without an injected
session; they're characterized by the bundle metrics above.)

| Category | Score |
| --- | --- |
| Performance | **94** |
| Accessibility | **95** |
| Best Practices | **96** |
| SEO | **100** |

Core Web Vitals (Lighthouse v12.8.2, emulated-mobile throttling): **FCP 0.8 s · TBT 60 ms ·
CLS 0 · LCP 3.1 s**. All four categories clear the **> 90** target; TBT and CLS are excellent
(lean JS + `next/font`), and LCP is the one metric to watch under mobile throttling. _(The CLI
exited non-zero only on its post-audit temp-dir cleanup — an `EPERM` in the sandbox `%TEMP%` —
**after** the report was written; the scores above are from that completed report.)_

### 2.5 Other strengths (verified)
- **Fonts self-hosted** via `next/font` (Inter / Geist / JetBrains Mono) — no external font CDN,
  no layout shift, covered by `font-src 'self'`.
- **Query caching tuned** (`staleTime` 30s, `refetchOnWindowFocus` off, no-retry on 4xx).
- Icon-driven UI (lucide inline SVG) — **no raster images** to optimize.

### 2.6 Recommendations
- Wire **Lighthouse-CI** against the prod build to track Core Web Vitals over time.
- Apply the same `next/dynamic` pattern to any future heavy, rarely-first-paint widgets.

---

## 3. Accessibility

### 3.1 Finding (runtime-flagged)
Radix emitted dev-mode warnings: *"Missing `Description` or `aria-describedby` for
{DialogContent}."* Audit: **8 of 9** dialogs already provided a `DialogTitle` **and**
`DialogDescription`; the gaps were the **mobile nav drawer** (title only) and **`ConfirmDialog`**
(description rendered only when a prop was passed).

### 3.2 Fix applied + verified
- `mobile-nav.tsx`: added an `sr-only` `DialogDescription` ("Primary navigation links and account
  actions.").
- `confirm-dialog.tsx`: always renders a `DialogDescription` (visible when provided, `sr-only`
  fallback otherwise).
- **Verified at runtime:** opening the drawer in the production build exposes
  `aria-describedby → "Primary navigation links and account actions."` (plus its `aria-labelledby`
  title), and the **console is warning-free**.

### 3.3 Existing strengths (verified)
- Global `*:focus-visible` ring (`ring-2 ring-primary/70 ring-offset-2`) — never removed.
- `FormField` puts labels above controls with inline error/hint; inputs flip to `aria-invalid`
  styling on error.
- `DataTable` renders a semantic `<table>` on desktop and a `<dl>` key/value card list on mobile;
  clickable rows are keyboard-operable (`role="button"`, Enter/Space).
- Status is conveyed by **dot + text**, not color alone (`StatusBadge`).
- Body text token `on-surface-variant (#475569)` on white ≈ 7.5:1 contrast (passes WCAG AA).

### 3.4 Recommendations
- Add an automated `axe`/Lighthouse-a11y check to CI to guard against regressions.
- Spot-check screen-reader flow on POS and the bill-detail pages during QA.

---

## 4. Files changed
```
apps/web/next.config.mjs                                  security headers + poweredByHeader:false
apps/web/package.json                                     postcss override ^8.5.10 (+ devDep bump)
apps/web/src/features/dashboard/top-medicines-chart.tsx   dynamic chart import
apps/web/src/features/dashboard/top-medicines-chart-inner.tsx   (new) Recharts body
apps/web/src/features/analytics/analytics-view.tsx        dynamic chart import
apps/web/src/features/analytics/analytics-top-chart.tsx   (new) Recharts body
apps/web/src/features/admin/platform-analytics.tsx        dynamic chart import
apps/web/src/features/admin/platform-analytics-chart.tsx  (new) Recharts body
apps/web/src/components/layout/mobile-nav.tsx             a11y: drawer DialogDescription
apps/web/src/components/shared/confirm-dialog.tsx         a11y: always-present description
.claude/launch.json                                       (tooling) added web-prod preview config
```
No files under `apps/api/` were modified.

---

## 5. Verification log
| # | Check | Command | Result |
| --- | --- | --- | --- |
| 1 | TypeScript | `tsc --noEmit` | exit 0 (clean) |
| 2 | Prod build | `next build` | ✓ 22/22 static, TS+lint pass |
| 3 | Dependency audit | `npm audit` | **0 vulnerabilities** (was 2 moderate) |
| 4 | Security headers | `Invoke-WebRequest /login` | all headers present; `X-Powered-By` absent |
| 5 | CSP compatibility | prod load + console | app works, charts render, **0 violations** |
| 6 | Secret leakage | scan `.next/static/*.js` | **0** secrets; public URL present (control) |
| 7 | Code-split effect | `next build` sizes | −37% First-Load JS on 3 chart routes |
| 8 | Chart functionality | prod runtime DOM | `SvgRoot` on dashboard; 2 chart containers on `/analytics` |
| 9 | Dialog a11y | prod runtime DOM | drawer `aria-describedby` wired; console clean |

---

## 6. Deployment considerations
- **Env:** `NEXT_PUBLIC_API_URL` is inlined at build → set it for the target environment before
  `next build`. Keep all secrets server-side (API); **rotate the committed Gemini key**.
- **HTTPS:** required for HSTS + `Secure` cookies. Set the refresh cookie `SameSite=None; Secure`
  and the API `CORS_ORIGIN` to the deployed web origin.
- **Runtime:** Node ≥ 20. `next start` (or a Node host / container) serves the build; the security
  headers are applied by Next at request time.
- **Monitoring:** add Lighthouse-CI + `axe` to the pipeline; surface client errors to a logger.

---

## 7. Overall assessment
The Stock Easy web client is **production-ready**. Security posture is strong and now hardened
with a verified header suite and a clean dependency tree; performance is lean with a measurable
code-splitting win; accessibility gaps surfaced at runtime were fixed and re-verified. The only
items standing between this build and a live deployment are **operational** (secret rotation,
HTTPS cookie flags, CORS origin) — documented in §6 — not code defects.
