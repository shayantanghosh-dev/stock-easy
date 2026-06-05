# Screenshots — visual asset library

A consistent set of product screenshots for GitHub, LinkedIn, resumes, slide decks, and the
portfolio/marketing site. Generated reproducibly from the **running app with seeded demo data**, so
every shot uses realistic numbers (8 pharmacies, 304 medicines, 550 batches, 930 bills).

## Generate / refresh

```bash
# 1) Have the stack running with a production build + seeded DB:
cd apps/api && npm run db:seed && npm run dev          # API on :4000
cd apps/web && npm run build && npm start              # Web (prod) on :3000

# 2) Install Playwright once, then capture:
cd apps/web
npm i -D playwright && npx playwright install chromium
node scripts/capture-screenshots.mjs
```

Output lands here in `docs/screenshots/` as `@2x` PNGs.

## Naming

`<screen>-<desktop|mobile>.png` — e.g. `dashboard-desktop.png`, `dashboard-mobile.png`,
`pos-desktop.png`, `analytics-desktop.png`, `ai-assistant-desktop.png`,
`admin-analytics-desktop.png`, `login-desktop.png`.

## Coverage

| Persona | Screens |
|---|---|
| (public) | Login |
| Owner | Dashboard · POS · Medicines · Batches · Analytics · AI Assistant · Bills · Subscription · Settings (desktop + mobile) |
| Central admin | Platform Analytics · Approvals · Tenants · Plans (desktop) |

> Customize the route list, viewports, and credentials at the top of
> [`apps/web/scripts/capture-screenshots.mjs`](../../apps/web/scripts/capture-screenshots.mjs).
> Demo logins (seed): `owner.apollo@stockeasy.test`, `admin@stockeasy.app`, password `StockEasy123!`.
