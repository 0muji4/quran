import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Error Handling E2E Tests
 * Tests error scenarios and edge cases in the redesigned practice screen.
 */

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
  });

  test('should fall back to ayah 1 when only the surah is provided', async ({
    page,
    recordPage
  }) => {
    // Legacy query-string URLs are 308-redirected to the canonical path-based
    // form; no ayah → defaults to 1. We assert we landed on the new shape.
    await page.goto(`/practice?surah=${testSurahs.alFatihah.id}`);
    await expect(page).toHaveURL(new RegExp(`/practice/${testSurahs.alFatihah.id}/1$`));
    await expect(recordPage.micButton).toBeVisible();
  });

  test('should redirect to home when an unknown surah is requested', async ({
    page,
    homePage
  }) => {
    await page.goto('/practice/999/1');
    // The server action throws; the page falls back to '/' which the
    // tolerant home renders even before BFF is ready.
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(homePage.heading).toBeVisible();
  });

  test('should handle a quick start/stop without crashing', async ({ recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    await recordPage.startRecording();
    await recordPage.waitForRecordingState();
    await recordPage.page.waitForTimeout(150);
    await recordPage.stopRecording();
    await recordPage.waitForRecordingEnded();

    // Whatever the result, the practice page must still be intact. After a
    // quick stop the panel may transition straight into the analysing card,
    // so accept that header in addition to the idle / recording ones.
    await expect(recordPage.listenToTeacherHeading).toBeVisible();
    await expect(
      recordPage.nowYouReciteHeading
        .or(recordPage.recordingHeading)
        .or(recordPage.analysingHeading)
    ).toBeVisible();
  });

  test('should reset state on a page reload during recording', async ({ page, recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    await recordPage.startRecording();
    await recordPage.waitForRecordingState();

    await page.reload();

    await expect(recordPage.micButton).toBeVisible();
    await expect(recordPage.recordingHeading).not.toBeVisible();
  });
});
