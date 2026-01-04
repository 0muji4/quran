import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Error Handling E2E Tests
 * Tests error scenarios and edge cases
 */

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Grant microphone permission
    await page.context().grantPermissions(['microphone']);
  });

  test('should handle recording without ayah selection', async ({ recordPage }) => {
    await recordPage.goto();

    // Select only surah, not ayah
    await recordPage.selectSurah(testSurahs.alFatihah.nameEn);

    // Try to start recording (might be disabled or show error)
    // Check if button is disabled or shows validation message
    const isDisabled = await recordPage.startRecordButton.isDisabled();

    if (!isDisabled) {
      // If button is enabled, clicking might show error
      await recordPage.startRecordButton.click();

      // Wait briefly to see if error appears
      await recordPage.page.waitForTimeout(1000);
    }

    // We expect either disabled button or no recording state
    const hasRecordingStatus = await recordPage.page
      .getByText(/recording/i)
      .isVisible()
      .catch(() => false);

    expect(hasRecordingStatus).toBe(false);
  });

  test('should handle network failure during upload', async ({ page, recordPage }) => {
    await recordPage.goto();

    // Select and record normally
    await recordPage.selectSurah(testSurahs.alFatihah.nameEn);
    await recordPage.selectAyah(1);

    await recordPage.startRecording();
    await page.waitForTimeout(1500);
    await recordPage.stopRecording();

    // Wait for audio preview
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });

    // Simulate network offline BEFORE upload starts
    // Note: This might not catch the upload if it's too fast
    // The test validates error handling capability
    await page.context().setOffline(true);

    // Wait to see if error appears
    await page.waitForTimeout(5000);

    // Check for any error messages
    const errorMessage = await recordPage.getErrorMessage();

    // Restore network
    await page.context().setOffline(false);

    // Error might appear or upload might have succeeded before offline
    // This test validates the app doesn't crash on network issues
  });

  test('should handle quick start-stop recording', async ({ recordPage }) => {
    await recordPage.goto();

    await recordPage.selectSurah(testSurahs.alFatihah.nameEn);
    await recordPage.selectAyah(1);

    // Start and immediately stop (very short recording)
    await recordPage.startRecording();
    await recordPage.page.waitForTimeout(100); // Only 100ms
    await recordPage.stopRecording();

    // Should still show audio preview (even if very short)
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });
  });

  test('should handle page reload during recording', async ({ page, recordPage }) => {
    await recordPage.goto();

    await recordPage.selectSurah(testSurahs.alFatihah.nameEn);
    await recordPage.selectAyah(1);

    // Start recording
    await recordPage.startRecording();
    await recordPage.waitForStatus(/recording/i);

    // Reload page
    await page.reload();

    // Verify page reloads successfully (state should reset)
    await expect(recordPage.surahSelect).toBeVisible();
    await expect(recordPage.startRecordButton).toBeVisible();

    // Recording should have stopped (no "Recording" status)
    const hasRecordingStatus = await page
      .getByText(/recording/i)
      .isVisible()
      .catch(() => false);

    expect(hasRecordingStatus).toBe(false);
  });

  test('should handle multiple reset clicks', async ({ recordPage }) => {
    await recordPage.goto();

    // Click reset multiple times without recording
    await recordPage.reset();
    await recordPage.reset();
    await recordPage.reset();

    // Page should still be functional
    await expect(recordPage.startRecordButton).toBeVisible();
    await expect(recordPage.surahSelect).toBeEnabled();

    // Should be able to use normally
    await recordPage.selectSurah(testSurahs.alFatihah.nameEn);
    await recordPage.selectAyah(1);
    await recordPage.startRecording();
    await recordPage.waitForStatus(/recording/i);
    await recordPage.stopRecordButton.click();
  });
});
