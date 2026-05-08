import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Practice Page Object Model
 * Represents the redesigned practice screen at /practice?surah=&ayah=
 *
 * The class name remains `RecordPage` for backwards compatibility with
 * existing fixture wiring, but it targets the new mic-button driven UI.
 */
export class RecordPage extends BasePage {
  readonly micButton: Locator;
  readonly stopButton: Locator;
  readonly nowYouReciteHeading: Locator;
  readonly recordingHeading: Locator;
  readonly listenToTeacherHeading: Locator;
  readonly idleCaption: Locator;
  readonly recordingCaption: Locator;
  readonly previousAyahLink: Locator;
  readonly nextAyahLink: Locator;
  readonly tryAgainButton: Locator;

  constructor(page: Page) {
    super(page);

    this.micButton = page.getByRole('button', { name: /start recording/i });
    this.stopButton = page.getByRole('button', { name: /stop recording/i });

    this.nowYouReciteHeading = page.getByRole('heading', { name: /now you recite/i });
    this.recordingHeading = page.getByRole('heading', { name: /^recording/i });
    this.listenToTeacherHeading = page.getByRole('heading', { name: /listen to the teacher/i });

    this.idleCaption = page.getByText(/tap the mic to begin/i);
    this.recordingCaption = page.getByText(/tap to stop and submit/i);

    this.previousAyahLink = page.getByRole('link', { name: /previous ayah/i });
    this.nextAyahLink = page.getByRole('link', { name: /next ayah/i });
    this.tryAgainButton = page.getByRole('button', { name: /try again/i });
  }

  /**
   * Navigate directly to a specific surah/ayah on the practice page.
   */
  async goto(surahId: string | number = '1', ayahNumber: number = 1) {
    await this.navigate(`/practice?surah=${surahId}&ayah=${ayahNumber}`);
  }

  /**
   * Navigate to the legacy /record route (which now redirects to /practice).
   */
  async gotoLegacy() {
    await this.navigate('/record');
  }

  /**
   * Click the mic button to begin recording.
   */
  async startRecording() {
    await expect(this.micButton).toBeVisible();
    await this.micButton.click();
    // Allow getUserMedia + AudioContext to come online.
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the stop button. The panel will progress through uploading/scoring
   * states; we don't assert on those here because they depend on real audio.
   */
  async stopRecording() {
    await expect(this.stopButton).toBeVisible();
    await this.stopButton.click();
  }

  /**
   * Wait for the panel to enter the recording state.
   */
  async waitForRecordingState(timeout = 5000) {
    await expect(this.recordingHeading).toBeVisible({ timeout });
  }

  /**
   * Wait for the panel to leave the recording state (upload/score/error).
   */
  async waitForRecordingEnded(timeout = 10000) {
    await expect(this.recordingHeading).not.toBeVisible({ timeout });
  }

  /**
   * Verify the resting state (mic visible, "Tap the mic to begin" caption).
   */
  async verifyIdleState() {
    await expect(this.nowYouReciteHeading).toBeVisible();
    await expect(this.micButton).toBeVisible();
    await expect(this.idleCaption).toBeVisible();
  }

  /**
   * Read the score number once the done state is reached.
   * In CI without real worker output this generally won't appear, so callers
   * should treat this as best-effort.
   */
  async readScore(): Promise<string | null> {
    const scoreLocator = this.page.locator('text=/\\b\\d{1,3}\\s*\\/\\s*100\\b/').first();
    if (await scoreLocator.isVisible().catch(() => false)) {
      return scoreLocator.textContent();
    }
    return null;
  }

  /**
   * Detect a status banner with the error class.
   */
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator('.status.error, [role="alert"]').first();
    if (await errorLocator.isVisible().catch(() => false)) {
      return errorLocator.textContent();
    }
    return null;
  }
}
