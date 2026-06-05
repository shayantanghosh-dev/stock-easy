# Observability & Monitoring

What ships today (verified), plus a ready-to-enable error-monitoring recipe.

## 1. Health checks ✅ (live)

The API exposes an unauthenticated liveness probe **outside** the `/api/v1` prefix:

```
GET /health  →  200  {"success":true,"data":{"status":"ok","uptime":<seconds>}}
```
Verified at runtime (`curl http://localhost:4000/health` → 200). Point your platform's health check /
uptime monitor here. It performs no DB I/O, so it stays green during transient DB blips (use it for
**liveness**; add a DB-touching readiness check only if your platform needs one).

## 2. Logging ✅ (live)

The API uses **Pino** structured JSON logging with **request-id correlation**:

- `requestId` middleware assigns/propagates a correlation id (runs first, so even rejected requests are traced).
- `requestLogger` logs each request; `LOG_LEVEL` controls verbosity (`trace`…`fatal`, default `info`).
- Example line: `{"level":30,"time":"…","service":"stock-easy-api","msg":"Stock Easy API listening on port 4000"}`

**Standards:** log JSON to stdout and let the platform aggregate (Render/Railway/CloudWatch/Datadog).
Never log secrets, tokens, full request bodies, or PII. Use `warn`/`error` for actionable events;
keep `info` for lifecycle + request summaries.

## 3. Error handling ✅ (live)

- **API:** a terminal `errorHandler` middleware shapes every failure into the standard envelope
  (`{ success:false, error:{ code, message } }`) and is the single place to forward exceptions to a tracker.
- **Web:** route-segment error boundaries (`app/(app)/error.tsx`) + a root `app/global-error.tsx`
  catch render/runtime errors and offer recovery instead of a white screen; mutation failures surface
  as Sonner toasts.

## 4. Error & performance monitoring — Sentry (ready to enable)

Not wired by default (needs an account + DSN). Both integrations are **DSN-gated**: with no DSN they
are inert, so enabling monitoring is purely additive and never affects business logic.

### Web (`@sentry/nextjs`)
```bash
cd apps/web && npm i @sentry/nextjs
```
Add `NEXT_PUBLIC_SENTRY_DSN` to the build env and initialize in `instrumentation-client.ts` +
`sentry.server.config.ts` (Sentry's wizard, `npx @sentry/wizard@latest -i nextjs`, scaffolds these).
Add the Sentry origin to the CSP `connect-src` in `next.config.mjs`.

### API (`@sentry/node`)
```bash
cd apps/api && npm i @sentry/node
```
Initialize once at the top of `src/server.ts` guarded by `process.env.SENTRY_DSN`, and forward
exceptions from the existing `errorHandler` middleware (`Sentry.captureException(err)`) — a one-line
addition at the single existing error boundary, so no business logic changes.

> **Status (honest):** health checks and structured logging are implemented and runtime-verified.
> Sentry is documented and scaffolded as the recommended next step; it has not been live-tested here
> because it requires a Sentry DSN/account. Once a DSN is provided, the steps above are sufficient.

## 5. What to watch in production

| Signal | Source | Alert when |
|---|---|---|
| Liveness | `GET /health` | non-200 / timeout |
| Error rate | API logs / Sentry | 5xx rate spikes |
| Latency | platform metrics / Sentry perf | p95 regresses |
| Auth failures | `/auth/*` logs | abnormal 401/refresh-reuse spikes |
| AI errors | `/ai` logs | Gemini 5xx / 503 (missing key) |
| DB | managed-DB dashboard | connections, slow queries, disk |
