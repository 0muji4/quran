/**
 * Global teardown for Playwright E2E tests
 * Optional cleanup - preserves containers for local development
 */

async function globalTeardown() {
  console.log('\n✅ E2E tests completed\n');

  // Note: We don't tear down Docker Compose here to allow:
  // 1. Faster re-runs during local development
  // 2. Manual inspection of services after test failures
  // 3. CI handles cleanup in workflow with 'docker compose down -v'
}

export default globalTeardown;
