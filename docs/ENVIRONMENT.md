# Environment Variables

Every variable for both apps. Templates: `apps/api/.env.example`, `apps/web/.env.example`.
**Never commit a real `.env` / `.env.local`** — both are gitignored.

## API (`apps/api/.env`)

| Variable | Required | Example / default | Notes |
|---|---|---|---|
| `NODE_ENV` | yes | `production` | `development` locally; `production` when deployed |
| `PORT` | no | `4000` | API listen port |
| `DATABASE_URL` | **yes** | `postgresql://user:pass@host:5432/stockeasy?schema=public` | Must match the Prisma datasource |
| `JWT_ACCESS_SECRET` | **yes** | 48+ random bytes | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | **yes** | 48+ random bytes | Distinct from the access secret |
| `ACCESS_TOKEN_TTL_SECONDS` | no | `900` | Access-token lifetime (15 min) |
| `REFRESH_TOKEN_TTL_DAYS` | no | `30` | Refresh-token lifetime |
| `BCRYPT_ROUNDS` | no | `12` | Password hashing cost |
| `CORS_ORIGIN` | **yes** | `https://app.yourdomain.com` | Comma-separated allowlist. **`"*"` is rejected.** Must include the web origin (cookies are credentialed). |
| `LOG_LEVEL` | no | `info` | Pino level (`trace`…`fatal`) |
| `GEMINI_API_KEY` | no* | — | *AI assistant (`/ai`) returns **503** until set. Key: <https://aistudio.google.com/apikey> |
| `AI_PROVIDER` | no | `gemini` | Provider switch for the assistant |
| `AI_MODEL` | no | `gemini-2.5-flash` | Model id |

**Production checklist:** generate fresh `JWT_*` secrets, set `NODE_ENV=production`, set `CORS_ORIGIN`
to the exact deployed web origin(s), and supply `GEMINI_API_KEY` via your platform's secret store
(never in the repo).

## Web (`apps/web/.env.local`)

| Variable | Required | Example / default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **yes** | `https://api.yourdomain.com/api/v1` | Includes the `/api/v1` prefix. **Inlined at build time** → must be set before `next build`. Must be an origin the API's `CORS_ORIGIN` allows. |
| `NEXT_PUBLIC_CURRENCY` | no | `₹` | Display currency symbol (domain is Indian pharmacy / GST). |

> Only `NEXT_PUBLIC_*` values reach the browser bundle — and both are non-sensitive. No server secret
> is ever exposed to the client (verified: a scan of the production bundle found zero secrets).
> See `PRODUCTION_READINESS.md` §1.2.
