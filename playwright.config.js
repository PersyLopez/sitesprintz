import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const runAllBrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === 'true';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  // E2E stability > speed (shared DB + seeded fixtures)
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: 1,
  reporter: isCI ? [['line'], ['html']] : [['html']],
  // globalSetup: './tests/setup/global-setup.js', // Replaced by setup project for auth

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-testid',
    reducedMotion: 'reduce',
  },

  projects: [
    // 1. Seed Database
    {
      name: 'db-setup',
      testMatch: /db\.setup\.js/,
    },
    // 2. Authenticate User (Depends on DB being seeded)
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.js/,
      dependencies: ['db-setup'],
    },
    // 3. Authenticate Admin (Depends on DB being seeded)
    {
      name: 'admin-setup',
      testMatch: /admin\.setup\.js/,
      dependencies: ['db-setup'],
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Default to user auth state.
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['auth-setup', 'admin-setup'],
    },
    ...(runAllBrowsers ? [
      {
        name: 'firefox',
        use: {
          ...devices['Desktop Firefox'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['auth-setup'],
      },
      {
        name: 'webkit',
        use: {
          ...devices['Desktop Safari'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['auth-setup'],
      },
      // Mobile viewports
      {
        name: 'Mobile Chrome',
        use: {
          ...devices['Pixel 5'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['setup'],
      },
      {
        name: 'Mobile Safari',
        use: {
          ...devices['iPhone 12'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['setup'],
      },
    ] : []),
  ],

  webServer: skipWebServer ? undefined : {
    // server.js serves ./dist, so ensure build exists before starting.
    // Skip build if dist/index.html exists (already built)
    command: '([ -f dist/index.html ] || npm run build) && NODE_ENV=test USE_MOCK_EMAIL=true CLIENT_URL=http://localhost:3000 PORT=3000 npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 180 * 1000, // 3 minutes (build skipped if exists)
  },
});

