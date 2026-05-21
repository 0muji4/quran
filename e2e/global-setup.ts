/**
 * Global setup for Playwright E2E tests
 * Ensures Docker Compose services are healthy before running tests
 */

async function globalSetup() {
  console.log('\n🔍 Checking if services are ready...\n');

  const maxAttempts = 60; // 60 seconds timeout
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        console.log('✅ Web service is ready!\n');
        return;
      }
    } catch {
      // Service not ready yet, continue waiting
    }

    // Wait 1 second before retry
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Show progress every 10 seconds
    if ((i + 1) % 10 === 0) {
      console.log(`⏳ Still waiting for services... (${i + 1}s elapsed)`);
    }
  }

  throw new Error(
    `❌ Services failed to start within ${maxAttempts} seconds. ` +
      'Please ensure Docker Compose is running: ' +
      'docker compose -f ops/docker/compose.dev.yml up'
  );
}

export default globalSetup;
