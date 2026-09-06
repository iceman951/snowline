import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests',
  testMatch: 'transactions.spec.ts',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5174', headless: true,
    launchOptions: process.env.SNOWLINE_BROWSER_PATH ? { executablePath: process.env.SNOWLINE_BROWSER_PATH } : {}
  },
  webServer: [
    { command: 'bun run scripts/transactions-test-api.ts', url: 'http://localhost:3101/health', reuseExistingServer: false },
    { command: 'bun run --cwd apps/web dev --port 5174', url: 'http://localhost:5174', reuseExistingServer: false,
      env: { SNOWLINE_API: 'http://localhost:3101' } }
  ]
});
