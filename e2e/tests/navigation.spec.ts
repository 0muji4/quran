import { test, expect } from '../fixtures/page-fixtures';

/**
 * Navigation E2E Tests
 * Tests basic routing and page navigation
 */

test.describe('Navigation', () => {
  test('should navigate from home to record page', async ({ page, homePage, recordPage }) => {
    // Navigate to home page
    await homePage.goto();

    // Verify home page loaded
    await homePage.verifyLoaded();

    // Click link to record page
    await homePage.navigateToRecord();

    // Verify URL changed to /record
    await expect(page).toHaveURL('/record');

    // Verify record page elements are visible
    await expect(recordPage.surahSelect).toBeVisible();
    await expect(recordPage.ayahSelect).toBeVisible();
    await expect(recordPage.startRecordButton).toBeVisible();
  });

  test('should load record page directly', async ({ recordPage }) => {
    // Navigate directly to record page
    await recordPage.goto();

    // Verify page elements are visible
    await expect(recordPage.surahSelect).toBeVisible();
    await expect(recordPage.ayahSelect).toBeVisible();
    await expect(recordPage.startRecordButton).toBeVisible();
    await expect(recordPage.resetButton).toBeVisible();
  });

  test('should display surah options in dropdown', async ({ recordPage }) => {
    await recordPage.goto();

    // Verify surah dropdown has options
    const surahOptions = await recordPage.surahSelect.locator('option').count();
    expect(surahOptions).toBeGreaterThan(0);

    // Verify at least Al-Fatihah is present
    const alFatihahOption = recordPage.surahSelect.locator('option', {
      hasText: /Al-Fatihah|الفاتحة/i,
    });
    await expect(alFatihahOption).toBeVisible();
  });
});
