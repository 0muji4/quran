# E2E Tests with Playwright

End-to-end tests for the Quran Project web application using Playwright.

## Overview

These tests run against the **full Docker Compose stack** with real services:

- ✅ Real PostgreSQL database
- ✅ Real MinIO object storage
- ✅ Real Redis queue
- ✅ Real Python worker with ASR processing
- ✅ Real Next.js web app

**No mocking** - this provides true end-to-end validation.

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js 20+** and **pnpm 8.15.9**
- **Playwright browsers** installed (see setup below)

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Install Playwright browsers:**

   ```bash
   pnpm exec playwright install chromium
   ```

3. **Start Docker Compose stack:**

   ```bash
   docker compose -f ops/docker/compose.dev.yml up -d
   ```

4. **Run database migrations:**
   ```bash
   make db-migrate
   ```

## Running Tests

### Run all E2E tests

```bash
pnpm test:e2e
```

### Run specific test file

```bash
pnpm test:e2e navigation
pnpm test:e2e recording-flow
pnpm test:e2e error-handling
```

### Run with UI mode (visual debugger)

```bash
pnpm test:e2e:ui
```

### Run in headed mode (see browser)

```bash
pnpm test:e2e:headed
```

### Debug mode (pauses on breakpoints)

```bash
pnpm test:e2e:debug
```

### View last test report

```bash
pnpm test:e2e:report
```

## Test Structure

```
e2e/
├── playwright.config.ts      # Playwright configuration
├── global-setup.ts           # Pre-test health checks
├── global-teardown.ts        # Post-test cleanup
├── pages/                    # Page Object Models
│   ├── BasePage.ts          # Base page class
│   ├── HomePage.ts          # Home page (/)
│   └── RecordPage.ts        # Record page (/record)
├── tests/
│   ├── navigation.spec.ts       # Navigation tests (3 tests, ~10s)
│   ├── recording-flow.spec.ts   # Recording workflow (5 tests, ~5-7 min)
│   └── error-handling.spec.ts   # Error scenarios (5 tests, ~30s)
├── fixtures/
│   ├── page-fixtures.ts     # Custom Playwright fixtures
│   └── test-data.ts         # Test data and utilities
└── utils/
    └── wait-helpers.ts      # Wait and polling utilities
```

## Test Suites

### Navigation Tests (~10 seconds)

- ✅ Navigate from home to record page
- ✅ Load record page directly
- ✅ Verify surah dropdown populated

### Recording Flow Tests (~5-7 minutes)

- ✅ **Complete recording workflow** - Select → Record → Upload → Score
- ✅ Button state management during recording
- ✅ Audio preview after recording
- ✅ Reset functionality
- ✅ Multiple ayah selections

**Note:** These tests use **real worker processing** (Python + Whisper ASR), which takes 30-60 seconds per test.

### Error Handling Tests (~30 seconds)

- ✅ Recording without ayah selection
- ✅ Network failure during upload
- ✅ Quick start-stop recording
- ✅ Page reload during recording
- ✅ Multiple reset clicks

## Debugging Tests

### View browser during test

```bash
pnpm test:e2e:headed
```

### Use Playwright Inspector

```bash
pnpm test:e2e:debug
```

### View traces and videos

After a test failure:

1. Check `test-results/` directory for videos and traces
2. Open trace file: `pnpm exec playwright show-trace test-results/<test-name>/trace.zip`
3. View HTML report: `pnpm test:e2e:report`

### Enable verbose logging

Set environment variable:

```bash
DEBUG=pw:api pnpm test:e2e
```

## Common Issues

### Services not starting

**Problem:** "Services failed to start within 60 seconds"

**Solution:**

```bash
# Check Docker is running
docker ps

# Start services manually
docker compose -f ops/docker/compose.dev.yml up -d

# Wait for services to be healthy
docker compose -f ops/docker/compose.dev.yml ps

# Check logs
docker compose -f ops/docker/compose.dev.yml logs web
```

### Tests timing out

**Problem:** Tests fail with "Timeout exceeded"

**Solution:**

- Worker processing takes 30-60s - this is normal
- Check worker logs: `docker compose -f ops/docker/compose.dev.yml logs worker`
- Verify database has surah/ayah data: `make db-status`

### Microphone permission errors

**Problem:** MediaRecorder fails in CI

**Solution:**

- Tests grant microphone permission automatically
- In headed mode, browser may prompt for permission
- CI runs in headless mode with permissions granted

### Port conflicts

**Problem:** "Port 3000 already in use"

**Solution:**

```bash
# Stop existing services
docker compose -f ops/docker/compose.dev.yml down

# Or use different ports in compose file
```

## CI Integration

Tests run automatically on every PR via GitHub Actions:

- Workflow: `.github/workflows/e2e.yml`
- Trigger: Push to any branch, PRs to develop/main
- Timeout: 30 minutes
- Artifacts: Reports (30 days), Videos (7 days on failure)

## Performance

- **Navigation tests:** ~10 seconds total
- **Recording flow:** ~5-7 minutes (real worker processing)
- **Error handling:** ~30 seconds total
- **Total suite:** ~8-10 minutes

### Why so slow?

Tests use **real Python worker** with Whisper ASR:

- Authentic validation of entire pipeline
- Catches real integration issues
- Worker processing: 30-60s per recording test

## Architecture Decisions

### Why no mocking?

- ✅ True end-to-end validation
- ✅ Catches integration issues
- ✅ Tests realistic user workflows
- ❌ Slower test execution (acceptable trade-off)

### Why serial execution?

- Initial implementation runs tests serially (workers: 1)
- Avoids database/Redis resource conflicts
- Can optimize to parallel execution once stable

### Why semantic selectors?

- Uses `getByRole()`, `getByText()`, `getByLabel()`
- No `data-testid` attributes needed
- More resilient to UI changes
- Better for accessibility

## Adding New Tests

1. **Create test file** in `e2e/tests/`
2. **Import fixtures:**
   ```typescript
   import { test, expect } from '../fixtures/page-fixtures';
   ```
3. **Use page objects:**
   ```typescript
   test('my test', async ({ recordPage }) => {
     await recordPage.goto();
     await recordPage.selectSurah('Al-Fatihah');
     // ...
   });
   ```
4. **Follow patterns** from existing tests
5. **Run locally** before committing

## Best Practices

- ✅ Use page objects for all interactions
- ✅ Use semantic selectors (role, label, text)
- ✅ Wait explicitly with `expect().toBeVisible()`
- ✅ Avoid arbitrary timeouts (`waitForTimeout`)
- ✅ Test user flows, not implementation details
- ✅ Keep tests independent (no shared state)
- ❌ Don't use CSS selectors (`.class #id`)
- ❌ Don't depend on test execution order
- ❌ Don't share data between tests

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)
