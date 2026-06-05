import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/test-env.ts'],
    include: ['tests/**/*.test.ts'],
    // One process, sequential files: a single shared Postgres + one Prisma client.
    // (Concurrency is exercised *within* a test via Promise.all, not across files.)
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/types/**', 'src/**/*.d.ts'],
    },
  },
});
