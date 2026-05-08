import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';
import { clearTilawahStorage, seedAttempts } from '../utils/storage-helpers';

/**
 * History page E2E Tests
 * Covers the empty state and attempt rendering from localStorage.
 */

test.describe('History', () => {
  test('should show the empty state when no attempts have been recorded', async ({ page }) => {
    await clearTilawahStorage(page);

    await page.goto('/history');

    await expect(page.getByText(/no attempts yet/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /browse the surah library/i })).toBeVisible();
  });

  test('should render seeded attempts and link back to /practice', async ({ page }) => {
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

    await page.getByRole('link', { name: /al-fatihah/i }).first().click();
    await expect(page).toHaveURL(/\/practice\/1\/1$/);
  });
});
