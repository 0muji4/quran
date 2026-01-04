import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { RecordPage } from '../pages/RecordPage';

/**
 * Custom Playwright fixtures for page objects
 * Extends base test with page object model instances
 */

type PageFixtures = {
  homePage: HomePage;
  recordPage: RecordPage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  recordPage: async ({ page }, use) => {
    const recordPage = new RecordPage(page);
    await use(recordPage);
  },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';
