import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Error Handling E2E Tests
 * Tests error scenarios and edge cases in the redesigned practice screen.
 */

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // The `microphone` permission name is Chromium-only in Playwright —
    // Firefox / WebKit throw `Unknown permission: microphone` from
    // grantPermissions. Skip the grant on non-Chromium browsers; these
    // tests do not exercise MediaRecorder directly (recording-flow is
    // explicitly excluded from cross-browser via testIgnore).
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['microphone']);
    }
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

  test('should redirect to home when an unknown surah is requested', async ({ page, homePage }) => {
    await page.goto('/practice/999/1');
    // The server action throws; the page falls back to '/' which the
    // tolerant home renders even before BFF is ready. After ADR 0023 the
    // home URL carries a locale prefix (default `/en`).
    await expect(page).toHaveURL(/\/(en|ar)\/?(\?.*)?$/);
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
    // quick stop the panel may end up in any of the post-recording states —
    // analysing if the audio made it through, or "couldn't process" if the
    // client-side too-short guard kicked in (the test stops after 150 ms).
    await expect(recordPage.listenToTeacherHeading).toBeVisible();
    await expect(
      recordPage.nowYouReciteHeading
        .or(recordPage.recordingHeading)
        .or(recordPage.analysingHeading)
        .or(recordPage.couldNotProcessHeading)
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
