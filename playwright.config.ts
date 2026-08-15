import { defineConfig, devices } from '@playwright/test'

// E2E запускается поверх поднятого dev-стэка:
//   npm run dev:server   (PAYMENTS_PROVIDER=mock, чтобы оплата шла без Stripe)
//   npm run dev:client
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'ru-RU',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npx concurrently -k -s first "npm:dev:server" "npm:dev:client"',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})