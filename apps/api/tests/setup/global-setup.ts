import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Vitest global setup — provisions a real PostgreSQL 16 for the whole run and
 * applies the Prisma migrations to it.
 *
 * Database source, in priority order:
 *   1. process.env.TEST_DATABASE_URL  — bring-your-own (e.g. a CI service container)
 *   2. Testcontainers (postgres:16-alpine) — the documented CI/local default
 *   3. embedded-postgres (PG16 binaries) — automatic fallback when Docker is absent
 *
 * The resolved connection string is written to tests/.tmp/database-url.txt; the
 * per-worker setup file reads it and points the app's Prisma client at it.
 */
const TMP_DIR = join(process.cwd(), 'tests', '.tmp');
const URL_FILE = join(TMP_DIR, 'database-url.txt');

async function startTestcontainers(): Promise<{ url: string; stop: () => Promise<void> }> {
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('stockeasy_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  return { url: container.getConnectionUri(), stop: () => container.stop().then(() => undefined) };
}

async function startEmbedded(): Promise<{ url: string; stop: () => Promise<void> }> {
  const EmbeddedPostgres = (await import('embedded-postgres')).default;
  const port = 54000 + Math.floor(Math.random() * 900);
  const dataDir = join(TMP_DIR, 'pgdata');
  rmSync(dataDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('stockeasy_test');

  return {
    url: `postgresql://postgres:postgres@localhost:${port}/stockeasy_test`,
    stop: () => pg.stop(),
  };
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  mkdirSync(TMP_DIR, { recursive: true });

  let url: string;
  let stop: () => Promise<void> = async () => undefined;

  if (process.env.TEST_DATABASE_URL) {
    url = process.env.TEST_DATABASE_URL;
    console.log('[db] using external TEST_DATABASE_URL');
  } else {
    try {
      const started = await startTestcontainers();
      url = started.url;
      stop = started.stop;
      console.log('[db] started PostgreSQL 16 via Testcontainers');
    } catch (err) {
      const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
      console.warn(`[db] Testcontainers unavailable (${reason}); falling back to embedded-postgres`);
      const started = await startEmbedded();
      url = started.url;
      stop = started.stop;
      console.log('[db] started embedded PostgreSQL 16');
    }
  }

  // Apply the real migrations — exactly what runs in prod. We MUST override both
  // DATABASE_URL and DIRECT_URL: the schema's datasource uses `directUrl` for
  // migrations, so leaving DIRECT_URL pointing at the value in .env would run
  // `migrate deploy` against the real (e.g. Neon) database instead of this
  // ephemeral test instance. Pinning both to the provisioned URL keeps tests
  // hermetic and prevents any accidental writes to production.
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'inherit',
  });

  writeFileSync(URL_FILE, url, 'utf8');

  return async () => {
    try {
      await stop();
    } finally {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
  };
}
