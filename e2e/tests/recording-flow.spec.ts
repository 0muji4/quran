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
    await expect(recordPage.page).toHaveURL(/\/practice\/1\/1$/);
    await expect(recordPage.micButton).toBeVisible();
  });

  test('should switch teacher playback rate via the speed pills', async ({ page, recordPage }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    const oneX = page.getByRole('button', { name: /^1\.00×$/ });
    const slowX = page.getByRole('button', { name: /^0\.75×$/ });
    const fastX = page.getByRole('button', { name: /^1\.25×$/ });

    await expect(oneX).toHaveAttribute('aria-pressed', 'true');

    await slowX.click();
    await expect(slowX).toHaveAttribute('aria-pressed', 'true');
    await expect(oneX).toHaveAttribute('aria-pressed', 'false');

    await fastX.click();
    await expect(fastX).toHaveAttribute('aria-pressed', 'true');
    await expect(slowX).toHaveAttribute('aria-pressed', 'false');
  });

  test('should toggle the loop ayah control on the teacher panel', async ({
    page,
    recordPage
  }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);

    const loopBtn = page.getByRole('button', { name: /loop ayah/i });
    await expect(loopBtn).toHaveAttribute('aria-pressed', 'false');

    await loopBtn.click();
    await expect(loopBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should disable Previous on the first ayah and Next on the last ayah', async ({
    page,
    recordPage
  }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);
    await expect(page.getByRole('link', { name: /previous ayah/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /next ayah/i })).toBeVisible();

    await recordPage.goto(testSurahs.alFatihah.id, testSurahs.alFatihah.ayahCount);
    await expect(page.getByRole('link', { name: /next ayah/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /previous ayah/i })).toBeVisible();
  });

  test('should persist last-practiced into localStorage when recording starts', async ({
    page,
    recordPage
  }) => {
    await recordPage.goto(testSurahs.alFatihah.id, 1);
    await recordPage.startRecording();
    await recordPage.waitForRecordingState();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('tilawah:last-practiced')
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.surahId).toBe(testSurahs.alFatihah.id);
    expect(parsed.ayahNumber).toBe(1);
  });
});
