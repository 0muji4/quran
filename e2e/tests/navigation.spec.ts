import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Navigation E2E Tests
 * Tests basic routing and page navigation in the Tilawah redesign.
 */

test.describe('Navigation', () => {
  test('should navigate from home to practice page via a surah card', async ({
    page,
    homePage,
    recordPage
  }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    await homePage.openSurah(testSurahs.alFatihah.nameEn);

    await expect(page).toHaveURL(/\/practice\/1\/1$/);
    await expect(recordPage.nowYouReciteHeading).toBeVisible();
    await expect(recordPage.listenToTeacherHeading).toBeVisible();
    await expect(recordPage.micButton).toBeVisible();
  });

  test('should load the practice page directly via path params', async ({ page, recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    await expect(page).toHaveURL(/\/practice\/1\/1$/);
    await expect(recordPage.nowYouReciteHeading).toBeVisible();
    await expect(recordPage.listenToTeacherHeading).toBeVisible();
    await expect(recordPage.micButton).toBeVisible();
  });

  test('should display surah cards in the library', async ({ homePage }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    // Al-Fatihah is part of the seeded surahs.
    await expect(homePage.surahCard(testSurahs.alFatihah.nameEn)).toBeVisible();
  });

  test('should support previous/next ayah navigation via the URL', async ({
    page,
    recordPage
  }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 2);

    await expect(recordPage.previousAyahLink).toBeVisible();
    await expect(recordPage.nextAyahLink).toBeVisible();

    await recordPage.nextAyahLink.click();
    await expect(page).toHaveURL(/\/practice\/1\/3$/);
  });
});
