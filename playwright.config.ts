import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * Tests run against full Docker Compose stack with real worker processing
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Match only E2E test files
  testMatch: '**/*.spec.ts',

  // Run tests serially to avoid resource conflicts
  fullyParallel: false,

  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Single worker to avoid DB/Redis conflicts
  workers: 1,

  // Reporters
  reporter: process.env.CI
    ? [['html'], ['github']]
    : [['html'], ['list']],

  // Global test timeout (60s per test - scoring jobs are slow)
  timeout: 60000,

  // Assertion timeout
  expect: {
    timeout: 10000,
  },

  // Shared test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Capture trace on failure for debugging
    trace: 'retain-on-failure',

    // Screenshots on failure only
    screenshot: 'only-on-failure',

    // Videos on failure only
    video: 'retain-on-failure',

    // Grant microphone permission (required for MediaRecorder)
    permissions: ['microphone'],

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Test against Chromium only initially
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Docker Compose stack if not already running
  webServer: process.env.CI
    ? undefined
    : {
        command: 'docker compose -f ops/docker/compose.dev.yml up',
        url: 'http://localhost:3000',
        timeout: 180000, // 3 minutes for full stack startup
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
