import { expect, test } from '@playwright/test';

/**
 * Mobile layout regression suite.
 *
 * These specs run against three viewport-overridden Playwright projects
 * (mobile-iphone 375 px, tablet-ipad 768 px, desktop-1024 1024 px) that
 * are configured to match this directory only. They guard the Phase 2.2
 * mobile fixes (PRs A-D) against future CSS regressions:
 *
 * - No horizontal scrollbar on the library or practice routes
 * - Mic button retains the WCAG 44 px tap-target floor
 *
 * Selectors mirror the resilient role/text patterns used by the
 * existing page objects so structural changes to the DOM do not break
 * the smoke check.
 */

const horizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('mobile layout regression', () => {
  test('library page does not overflow horizontally', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /choose a surah to recite/i })
    ).toBeVisible();

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('practice page does not overflow horizontally', async ({ page }) => {
    await page.goto('/practice/1/1');
    await expect(page.getByRole('heading', { name: /now you recite/i })).toBeVisible();

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('practice mic button keeps the 44 px tap-target floor', async ({ page }) => {
    await page.goto('/practice/1/1');
    const mic = page.getByRole('button', { name: /start recording/i });
    await expect(mic).toBeVisible();

    const box = await mic.boundingBox();
    expect(box, 'mic button must report a bounding box').not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
