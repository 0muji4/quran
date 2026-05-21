import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';
import { clearTilawahStorage, seedAttempts } from '../utils/storage-helpers';

/**
 * History page E2E Tests.
 *
 * History is account-scoped: anonymous users get a "Sign in to track"
 * prompt; signed-in users see their attempts from BFF + cache. The
 * signed-in path is intentionally not exercised here yet — it lands
 * with the RemoteHistoryStore swap, which is when we will introduce
 * an authenticated Playwright fixture.
 */

test.describe('History', () => {
  test('shows the "sign in to track" prompt for anonymous users', async ({ page }) => {
    await clearTilawahStorage(page);

    await page.goto('/history');

    // TopNav also shows a "Sign in" link for anonymous users; scope to
    // the main content area so the assertion targets the empty-state
    // CTA specifically.
    const main = page.locator('#main-content');
    await expect(main.getByText(/sign in to track your practice/i)).toBeVisible();
    await expect(main.getByRole('link', { name: /^sign in$/i })).toBeVisible();
  });

  test.skip('renders seeded attempts and links back to /practice (signed-in path)', async ({
    page
  }) => {
    // Re-enable when the signed-in Playwright fixture lands with the
    // RemoteHistoryStore swap — anonymous localStorage seeding no
    // longer surfaces because the gated cache returns empty for
    // anonymous users.
    const attempt = {
      id: 'job-test-1',
      surahId: testSurahs.alFatihah.id,
      surahNameEn: testSurahs.alFatihah.nameEn,
      ayahNumber: 1,
      score: 87,
      jobId: 'job-test-1',
      createdAt: new Date().toISOString(),
      status: 'COMPLETED' as const
    };
    await seedAttempts(page, [attempt]);

    await page.goto('/history');

    await expect(page.getByText(/al-fatihah · ayah 1/i)).toBeVisible();
    await expect(page.getByText(/^87$/)).toBeVisible();

    await page
      .getByRole('link', { name: /al-fatihah/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/practice\/1\/1$/);
  });
});
