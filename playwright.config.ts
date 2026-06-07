import { defineConfig, devices } from '@playwright/test';

// AIRLUXO end-to-end tests. Runs against a local production preview (no password
// gate, no network deps) by default — set BASE_URL to point elsewhere (e.g. staging
// with httpCredentials). Multi-browser incl. mobile. HTML report + traces document
// each run (what/when/which browser passed). See TESTING.md.

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

// The public browser projects skip the auth setup and the logged-in specs.
const PUBLIC_IGNORE = [/auth\.setup\.ts/, /\.loggedin\.spec\.ts/];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // For gated environments (staging), set BASIC_AUTH="user:pass".
    httpCredentials: process.env.BASIC_AUTH
      ? { username: process.env.BASIC_AUTH.split(':')[0], password: process.env.BASIC_AUTH.split(':').slice(1).join(':') }
      : undefined,
  },

  projects: [
    // Auth fixture: logs in once and saves the session for logged-in specs.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // Public flows across all browsers (skip the auth setup + logged-in specs).
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: PUBLIC_IGNORE },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: PUBLIC_IGNORE },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: PUBLIC_IGNORE },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testIgnore: PUBLIC_IGNORE },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testIgnore: PUBLIC_IGNORE },

    // Logged-in flows (*.loggedin.spec.ts) reuse the saved partner session.
    {
      name: 'logged-in',
      testMatch: /\.loggedin\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/partner.json' },
    },
  ],

  // Build once + serve the production bundle locally. Reused if already running.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
