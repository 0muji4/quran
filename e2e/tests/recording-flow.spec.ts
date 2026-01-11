import { test, expect } from '../fixtures/page-fixtures';
import { testSurahs } from '../fixtures/test-data';

/**
 * Recording Flow E2E Tests
 * Tests the complete recording → upload → scoring workflow
 * Note: Uses REAL worker processing (30-60s per test)
 */

test.describe('Recording Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Grant microphone permission for MediaRecorder
    await page.context().grantPermissions(['microphone']);
  });

  // Skip this test in CI - requires real audio blob upload and backend processing
  // Fake media devices generate empty audio that doesn't trigger upload/job creation
  test.skip('should complete full recording and scoring workflow', async ({ recordPage }) => {
    // Navigate to record page
    await recordPage.goto();

    // Select Al-Fatihah, Ayah 1
    await recordPage.selectSurah(testSurahs.alFatihah.id);
    await recordPage.selectAyah(1);

    // Start recording
    await recordPage.startRecording();

    // Verify recording state
    await recordPage.waitForStatus(/recording/i);
    await recordPage.verifyButtonState('recording');

    // Record for 2 seconds
    await recordPage.page.waitForTimeout(2000);

    // Stop recording
    await recordPage.stopRecording();

    // Wait for audio preview to appear
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });

    // Wait for upload and job creation
    await recordPage.waitForStatus(/uploading|creating/i, 10000);
    await recordPage.waitForJobCreation(15000);

    // Wait for worker to process (real ASR - can take 30-60s)
    await recordPage.waitForJobCompletion(70000);

    // Verify score is displayed
    await recordPage.verifyScore();
  });

  test('should disable controls during recording', async ({ recordPage }) => {
    await recordPage.goto();

    // Select surah and ayah
    await recordPage.selectSurah(testSurahs.alFatihah.id);
    await recordPage.selectAyah(1);

    // Verify selects are enabled initially
    await recordPage.verifySelectsEnabled();

    // Start recording
    await recordPage.startRecording();

    // Verify selects are disabled during recording
    await recordPage.verifySelectsDisabled();

    // Stop recording
    await recordPage.stopRecording();

    // Wait a moment for state update
    await recordPage.page.waitForTimeout(500);
  });

  test('should show audio preview after recording', async ({ recordPage }) => {
    await recordPage.goto();

    // Select and record
    await recordPage.selectSurah(testSurahs.alFatihah.id);
    await recordPage.selectAyah(2);

    await recordPage.startRecording();
    await recordPage.page.waitForTimeout(1500);
    await recordPage.stopRecording();

    // Verify audio element appears
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });

    // Verify audio has src attribute
    const audioSrc = await recordPage.audioPreview.getAttribute('src');
    expect(audioSrc).toBeTruthy();
    expect(audioSrc).toContain('blob:'); // Should be blob URL
  });

  test('should reset recording state', async ({ recordPage }) => {
    await recordPage.goto();

    // Select and record
    await recordPage.selectSurah(testSurahs.alFatihah.id);
    await recordPage.selectAyah(1);

    await recordPage.startRecording();
    await recordPage.page.waitForTimeout(1000);
    await recordPage.stopRecording();

    // Wait for audio preview
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });

    // Click reset
    await recordPage.reset();

    // Verify audio preview is gone
    await expect(recordPage.audioPreview).not.toBeVisible();

    // Verify can start recording again
    await recordPage.startRecording();
    await recordPage.waitForStatus(/recording/i);
    await recordPage.stopRecording();
  });

  test('should handle multiple ayah selections', async ({ recordPage }) => {
    await recordPage.goto();

    // Select first surah
    await recordPage.selectSurah(testSurahs.alFatihah.id);

    // Verify ayah options populated
    const ayahOptions = await recordPage.ayahSelect.locator('option').count();
    expect(ayahOptions).toBeGreaterThan(0);

    // Select different ayah
    await recordPage.selectAyah(3);

    // Start recording
    await recordPage.startRecording();
    await recordPage.waitForStatus(/recording/i);

    // Stop and verify
    await recordPage.page.waitForTimeout(1000);
    await recordPage.stopRecording();
    await expect(recordPage.audioPreview).toBeVisible({ timeout: 5000 });
  });
});
