import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const runAllBrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === 'true';

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
    reducedMotion: 'reduce',
  },

  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state.
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(runAllBrowsers ? [
      {
        name: 'firefox',
        use: {
          ...devices['Desktop Firefox'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['setup'],
      },
      {
        name: 'webkit',
        use: {
          ...devices['Desktop Safari'],
          storageState: 'tests/e2e/.auth/user.json',
        },
        dependencies: ['setup'],
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

  webServer: {
    // server.js serves ./dist, so ensure build exists before starting.
    command: 'npm run build && NODE_ENV=test USE_MOCK_EMAIL=true CLIENT_URL=http://localhost:3000 PORT=3000 npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
});

