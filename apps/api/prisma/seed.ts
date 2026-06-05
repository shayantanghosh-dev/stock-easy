/**
 * Stock Easy — database seed entry point.
 * ---------------------------------------------------------------------------
 * Generates a realistic, multi-tenant DEMO dataset for development & testing:
 *   • the existing central administrator is preserved (a default is created only
 *     if none exists) — no additional platform admins are ever created;
 *   • 8 pharmacy tenants spanning approved / pending / rejected and every
 *     subscription state (active, active-trial, expired-trial, past-due, cancelled);
 *   • per approved pharmacy: owner + staff, dealers, a realistic medicine catalog,
 *     batches (with a deliberate mix of healthy / low-stock / near-expiry / expired),
 *     ~6 months of FEFO-allocated sales, returns, voids, stock movements and AI logs.
 *
 * Idempotent + repeatable: clears tenant data (preserving the admin + plans) and
 * regenerates deterministically. The heavy lifting lives in ./seed/*.
 *
 * Run with:
 *   npm run seed          # (or: npx prisma db seed)
 *   npm run seed:reset    # full prisma migrate reset + reseed
 *
 * Safety: refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=true.
 * Override defaults with SEED_PASSWORD, SEED_RNG, SEED_EMAIL_DOMAIN, SEED_HISTORY_DAYS.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { printReport, runDemoSeed } from './seed/index';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const report = await runDemoSeed(prisma);
  printReport(report);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    process.stderr.write(`Seed failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
