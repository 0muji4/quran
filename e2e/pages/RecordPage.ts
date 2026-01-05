import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Record Page Object Model
 * Represents the recording/testing page at /record
 * Based on RecorderClient component state management
 */
export class RecordPage extends BasePage {
  // Selectors - using semantic queries for stability
  readonly surahSelect: Locator;
  readonly ayahSelect: Locator;
  readonly startRecordButton: Locator;
  readonly stopRecordButton: Locator;
  readonly resetButton: Locator;
  readonly statusMessage: Locator;
  readonly audioPreview: Locator;

  constructor(page: any) {
    super(page);

    // Dropdowns
    this.surahSelect = page.locator('select').first();
    this.ayahSelect = page.locator('select').nth(1);

    // Buttons
    this.startRecordButton = page.getByRole('button', { name: /start recording/i });
    this.stopRecordButton = page.getByRole('button', { name: /stop recording/i });
    this.resetButton = page.getByRole('button', { name: /reset/i });

    // Status and results
    this.statusMessage = page.locator('.status').first();
    this.audioPreview = page.locator('audio[controls]');
  }

  /**
   * Navigate to record page
   */
  async goto() {
    await this.navigate('/record');
  }

  /**
   * Select a surah by ID
   */
  async selectSurah(surahId: string) {
    await this.surahSelect.selectOption({ value: surahId });
    // Wait for ayah dropdown to populate
    await this.page.waitForTimeout(500);
  }

  /**
   * Select an ayah by number
   */
  async selectAyah(ayahNumber: number) {
    await this.ayahSelect.selectOption({ value: String(ayahNumber) });
  }

  /**
   * Start recording
   */
  async startRecording() {
    await this.startRecordButton.click();
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    await this.stopRecordButton.click();
  }

  /**
   * Click reset button
   */
  async reset() {
    await this.resetButton.click();
  }

  /**
   * Wait for a specific status message to appear
   */
  async waitForStatus(statusText: string | RegExp, timeout = 10000) {
    await expect(this.page.getByText(statusText)).toBeVisible({ timeout });
  }

  /**
   * Wait for job ID to be created and displayed
   */
  async waitForJobCreation(timeout = 15000) {
    // Wait for job ID text or pill to appear
    await expect(
      this.page.locator('text=/job.*id|session/i').first()
    ).toBeVisible({ timeout });
  }

  /**
   * Wait for scoring job to complete (COMPLETED or FAILED status)
   * This can take 30-60s for real worker processing
   */
  async waitForJobCompletion(timeout = 65000) {
    // Wait for either COMPLETED or FAILED status
    await expect(
      this.page.locator('text=/Status:.*(?:COMPLETED|FAILED)/i').first()
    ).toBeVisible({ timeout });
  }

  /**
   * Verify recording flow is complete (audio preview + job ID visible)
   */
  async verifyRecordingFlowComplete() {
    await expect(this.audioPreview).toBeVisible();
    await this.waitForJobCreation();
  }

  /**
   * Verify score is displayed
   */
  async verifyScore() {
    // Look for score-related text (Overall score, Accuracy, Fluency, etc.)
    await expect(
      this.page.locator('text=/overall score|accuracy|fluency|score:/i').first()
    ).toBeVisible({ timeout: 70000 }); // Extra time for worker processing
  }

  /**
   * Get error message if visible
   */
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator('.error, [role="alert"]').first();
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent();
    }
    return null;
  }

  /**
   * Verify buttons are in expected state
   */
  async verifyButtonState(state: 'recording' | 'idle' | 'disabled') {
    if (state === 'recording') {
      await expect(this.stopRecordButton).toBeVisible();
      await expect(this.startRecordButton).not.toBeVisible();
    } else if (state === 'idle') {
      await expect(this.startRecordButton).toBeVisible();
      await expect(this.stopRecordButton).not.toBeVisible();
    }
  }

  /**
   * Check if selects are disabled (during recording)
   */
  async verifySelectsDisabled() {
    await expect(this.surahSelect).toBeDisabled();
    await expect(this.ayahSelect).toBeDisabled();
  }

  /**
   * Check if selects are enabled
   */
  async verifySelectsEnabled() {
    await expect(this.surahSelect).toBeEnabled();
    await expect(this.ayahSelect).toBeEnabled();
  }
}
