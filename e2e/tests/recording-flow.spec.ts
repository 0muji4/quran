import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Recording Flow E2E Tests
 * Tests the practice screen state transitions in the redesigned UI.
 *
 * Real ASR scoring (which requires non-empty audio and the worker pipeline)
 * is intentionally skipped in CI; we exercise UI state changes only.
 */

test.describe('Recording Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Grant microphone permission for MediaRecorder.
    await page.context().grantPermissions(['microphone']);
  });

  // Skipped in CI: requires real audio + worker.
  test.skip('should complete full recording and scoring workflow', async ({ recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);
    await recordPage.startRecording();
    await recordPage.waitForRecordingState();
    await recordPage.page.waitForTimeout(2000);
    await recordPage.stopRecording();

    const score = await recordPage.readScore();
    expect(score).toBeTruthy();
  });

  test('should switch to recording state when the mic is tapped', async ({ recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);
    await recordPage.verifyIdleState();

    await recordPage.startRecording();
    await recordPage.waitForRecordingState();
    await expect(recordPage.recordingCaption).toBeVisible();
  });

  test('should leave the recording state when stop is tapped', async ({ recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    await recordPage.startRecording();
    await recordPage.waitForRecordingState();

    await recordPage.page.waitForTimeout(800);
    await recordPage.stopRecording();
    await recordPage.waitForRecordingEnded();
  });

  test('should preserve the practice layout across ayah navigation', async ({ recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 2);
    await expect(recordPage.nowYouReciteHeading).toBeVisible();
    await expect(recordPage.listenToTeacherHeading).toBeVisible();

    await recordPage.previousAyahLink.click();
    await expect(recordPage.page).toHaveURL(/ayah=1/);
    await expect(recordPage.micButton).toBeVisible();
  });
});
