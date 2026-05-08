import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';
import { clearTilawahStorage, seedLastPracticed } from '../utils/storage-helpers';

/**
 * Surah library E2E Tests
 * Covers search, filter pills, and Continue card hydration from
 * localStorage.
 */

test.describe('Surah library', () => {
  test('should narrow results by search query', async ({ homePage }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    await homePage.searchInput.fill('Fatihah');

    await expect(homePage.surahCard(testSurahs.alFatihah.nameEn)).toBeVisible();
    await expect(homePage.surahCard(testSurahs.alBaqarah.nameEn)).not.toBeVisible();
  });

  test('should narrow results by Mecca filter', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    await page.getByRole('button', { name: /^Mecca$/ }).click();

    await expect(homePage.surahCard(testSurahs.alFatihah.nameEn)).toBeVisible();
    await expect(homePage.surahCard(testSurahs.alBaqarah.nameEn)).not.toBeVisible();
  });

  test('should restore the full list when All is selected', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    await page.getByRole('button', { name: /^Mecca$/ }).click();
    await expect(homePage.surahCard(testSurahs.alBaqarah.nameEn)).not.toBeVisible();

    await page.getByRole('button', { name: /^All\b/ }).click();
    await expect(homePage.surahCard(testSurahs.alBaqarah.nameEn)).toBeVisible();
  });

  test('should show an empty state when nothing matches the query', async ({
    page,
    homePage
  }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    await homePage.searchInput.fill('zzz-no-such-surah');

    await expect(page.getByText(/no surahs match/i)).toBeVisible();
  });

  test('should hydrate the Continue card from localStorage', async ({ page, homePage }) => {
    await seedLastPracticed(page, {
      surahId: testSurahs.alFatihah.id,
      ayahNumber: 3,
      surahNameEn: testSurahs.alFatihah.nameEn,
      surahNameAr: testSurahs.alFatihah.nameAr,
      ayahCount: testSurahs.alFatihah.ayahCount,
      practicedAt: new Date().toISOString()
    });

    await homePage.goto();

    const resumeLink = page.getByRole('link', { name: /resume ayah 3/i });
    await expect(resumeLink).toBeVisible();
    await expect(resumeLink).toHaveAttribute(
      'href',
      `/practice?surah=${testSurahs.alFatihah.id}&ayah=3`
    );
  });

  test('should show the Continue empty prompt when no practice history exists', async ({
    page,
    homePage
  }) => {
    await clearTilawahStorage(page);

    await homePage.goto();

    await expect(page.getByRole('link', { name: /start practice/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /resume ayah/i })).not.toBeVisible();
  });
});
