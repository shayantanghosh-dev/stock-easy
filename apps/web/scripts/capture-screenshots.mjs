// Portfolio screenshot generator for Stock Easy.
//
// Logs in through the real UI and captures every major screen at desktop and
// mobile widths into ../../docs/screenshots/. Produces a consistent asset
// library for GitHub, LinkedIn, resumes, and the marketing/portfolio site.
//
// Prerequisites:
//   - API running + DB seeded   (cd apps/api && npm run db:seed && npm run dev)
//   - Web running                (cd apps/web && npm run build && npm start)   ← use a prod build
//   - Playwright installed        (cd apps/web && npm i -D playwright && npx playwright install chromium)
//
// Run:
//   node scripts/capture-screenshots.mjs
//   BASE_URL=http://localhost:3000 EMAIL=owner.apollo@stockeasy.test PASSWORD='StockEasy123!' node scripts/capture-screenshots.mjs
//
// Env: BASE_URL, EMAIL, PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../../docs/screenshots");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.EMAIL ?? "owner.apollo@stockeasy.test";
const PASSWORD = process.env.PASSWORD ?? "StockEasy123!";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@stockeasy.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "StockEasy123!";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// Routes captured for each signed-in persona.
const OWNER_ROUTES = [
  ["dashboard", "/dashboard"],
  ["pos", "/pos"],
  ["medicines", "/medicines"],
  ["batches", "/batches"],
  ["analytics", "/analytics"],
  ["ai-assistant", "/ai"],
  ["bills", "/bills"],
  ["subscription", "/subscription"],
  ["settings", "/settings"],
];
const ADMIN_ROUTES = [
  ["admin-analytics", "/admin/analytics"],
  ["admin-approvals", "/admin/approvals"],
  ["admin-tenants", "/admin/tenants"],
  ["admin-plans", "/admin/plans"],
];

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function shoot(browser, { width, height }, suffix, email, password, routes) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await login(page, email, password);
  for (const [name, path] of routes) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900); // let charts/animations settle
    const file = resolve(OUT, `${name}-${suffix}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("✓", `${name}-${suffix}.png`);
  }
  await ctx.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Login screen itself (no auth).
  for (const [suffix, vp] of [["desktop", DESKTOP], ["mobile", MOBILE]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: resolve(OUT, `login-${suffix}.png`) });
    console.log("✓", `login-${suffix}.png`);
    await ctx.close();
  }

  // Owner persona — desktop + mobile.
  await shoot(browser, DESKTOP, "desktop", EMAIL, PASSWORD, OWNER_ROUTES);
  await shoot(browser, MOBILE, "mobile", EMAIL, PASSWORD, OWNER_ROUTES);

  // Central-admin persona — desktop.
  await shoot(browser, DESKTOP, "desktop", ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROUTES);

  await browser.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
