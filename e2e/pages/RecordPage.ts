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
   * Wait for select dropdown to have options populated (not just "No surahs available")
   * Handles race condition with async data loading
   */
  private async waitForSelectHasOptions(
    selectLocator: Locator,
    timeout = 30000
  ): Promise<void> {
    // Wait until the select has at least 2 options (more than just the "No surahs available" option)
    await this.page.waitForFunction(
      (select) => {
        const selectElement = select as HTMLSelectElement;
        const options = Array.from(selectElement.options);
        // Filter out the placeholder/error option
        const validOptions = options.filter(opt => opt.value && opt.value !== '');
        return validOptions.length > 0;
      },
      selectLocator,
      { timeout }
    );
  }

  /**
   * Select a surah by ID or name
   */
  async selectSurah(surahIdOrName: string) {
    await this.surahSelect.waitFor({ state: 'visible' });
    await expect(this.surahSelect).toBeEnabled();

    // Wait for options to be populated in the dropdown
    // This handles the race condition where API hasn't completed yet
    await this.waitForSelectHasOptions(this.surahSelect);

    const matched = await this.surahSelect.evaluate(
      (select, candidate) => {
        const options = Array.from(select.options);
        const byValue = options.find((option) => option.value === candidate);
        if (byValue) {
          select.value = byValue.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        const regex = new RegExp(candidate, 'i');
        const byLabel = options.find((option) => regex.test(option.label));
        if (byLabel) {
          select.value = byLabel.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        return false;
      },
      surahIdOrName
    );
    if (!matched) {
      await this.surahSelect.selectOption({ value: surahIdOrName });
    }
    // Wait for ayah dropdown to populate
    await this.page.waitForTimeout(500);
  }

  /**
   * Select an ayah by number
   */
  async selectAyah(ayahNumber: number) {
    await this.ayahSelect.waitFor({ state: 'visible' });
    await expect(this.ayahSelect).toBeEnabled();

    const ayahValue = String(ayahNumber);

    // Wait for ayah options to be populated
    await this.waitForSelectHasOptions(this.ayahSelect);

    const label = `Ayah ${ayahNumber}`;
    const matched = await this.ayahSelect.evaluate(
      (select, ayahLabel, ayahValueParam) => {
        const options = Array.from(select.options);
        const byValue = options.find((option) => option.value === ayahValueParam);
        if (byValue) {
          select.value = byValue.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        const regex = new RegExp(ayahLabel, 'i');
        const byLabel = options.find((option) => regex.test(option.label));
        if (byLabel) {
          select.value = byLabel.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        return false;
      },
      label,
      ayahValue
    );
    if (!matched) {
      await this.ayahSelect.selectOption({ value: ayahValue });
    }
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
