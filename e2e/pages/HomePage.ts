import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Home Page Object Model
 * Represents the Surah library landing page at /
 */
export class HomePage extends BasePage {
  readonly heading: Locator = this.page.getByRole('heading', {
    name: /choose a surah to recite/i
  });

  readonly searchInput: Locator = this.page.getByPlaceholder(/search by surah/i);

  /**
   * Navigate to home page.
   */
  async goto() {
    await this.navigate('/');
  }

  /**
   * Verify the page has loaded correctly.
   */
  async verifyLoaded() {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Locate a surah card by its English name.
   */
  surahCard(name: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(name, 'i') }).first();
  }

  /**
   * Click a surah card and wait for navigation to /practice.
   */
  async openSurah(name: string) {
    await this.surahCard(name).click();
    await this.page.waitForURL(/\/practice/);
  }
}
