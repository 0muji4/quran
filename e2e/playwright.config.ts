import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * Tests run against full Docker Compose stack with real worker processing
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Match only E2E test files (not vitest tests)
  testMatch: '**/e2e/tests/**/*.spec.ts',

  // Ignore all other test files
  testIgnore: ['**/apps/**', '**/packages/**', '**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],

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

  // Project layout
  // - chromium-desktop: existing 1280x720 desktop coverage; skips mobile-only specs
  // - mobile-iphone / tablet-ipad / desktop-1024: viewport-only overrides for the
  //   mobile-layout regression specs under e2e/tests/mobile/. Stays on the
  //   chromium engine so CI's `playwright install chromium` is sufficient.
  projects: [
    {
      name: 'chromium-desktop',
      testIgnore: /[\\/]mobile[\\/]/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone',
      testMatch: /[\\/]mobile[\\/]/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'tablet-ipad',
      testMatch: /[\\/]mobile[\\/]/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop-1024',
      testMatch: /[\\/]mobile[\\/]/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
  ],

  // Start Docker Compose stack if not already running
  webServer: {
    command: 'docker compose -f ops/docker/compose.dev.yml up',
    url: 'http://localhost:3000',
    timeout: 180000, // 3 minutes for full stack startup
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
