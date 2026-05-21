import type { Page } from '@playwright/test';

/**
 * Base Page Object Model
 * Provides common functionality for all page objects
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a path and wait for load
   */
  async navigate(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}
