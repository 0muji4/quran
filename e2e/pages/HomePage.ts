import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Home Page Object Model
 * Represents the landing page at /
 */
export class HomePage extends BasePage {
  // Locators
  readonly welcomeHeading = this.page.getByRole('heading', { name: /welcome/i });
  readonly recordButton = this.page.getByRole('link', { name: /recorder|record/i });

  /**
   * Navigate to home page
   */
  async goto() {
    await this.navigate('/');
  }

  /**
   * Verify page has loaded correctly
   */
  async verifyLoaded() {
    await expect(this.welcomeHeading).toBeVisible();
  }

  /**
   * Navigate to the record page
   */
  async navigateToRecord() {
    await this.recordButton.click();
    await this.page.waitForURL('/record');
  }
}
