import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests',
  testIgnore: 'transactions.spec.ts', // Uses its own disposable API/config.
  timeout: 20000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    launchOptions: process.env.SNOWLINE_BROWSER_PATH ? { executablePath: process.env.SNOWLINE_BROWSER_PATH } : existsSync('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser') ? { executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' } : {}
  },
  webServer: [
    { command: 'bun run dev:api', url: 'http://localhost:3001/health', reuseExistingServer: !process.env.CI },
    { command: 'bun run dev:web', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI }
  ]
});
