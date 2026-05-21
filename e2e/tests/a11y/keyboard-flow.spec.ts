import { expect, test } from '@playwright/test';

/**
 * Keyboard-flow regression suite for Phase 2.3-E.
 *
 * Locks in three properties keyboard-only users rely on:
 *
 *   1. The skip link is the first stop on every page and Enter on it
 *      hands focus to the <main> landmark, bypassing the top nav.
 *   2. A surah card on the library is keyboard-activatable and Enter
 *      navigates to /practice/<id>/1.
 *   3. The mic button on the practice page is keyboard-activatable and
 *      Enter advances the recorder into the recording state.
 *
 * These specs do not Tab-count: counting fragile because search box and
 * filter pills sit between the skip link and the first surah card and
 * may evolve. Instead they assert that each interactive element is
 * focusable and that activation produces the expected outcome.
 */

test.describe('keyboard-only flow', () => {
  test('skip link is the first focus stop and lands on main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const firstFocusText = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(firstFocusText.trim()).toMatch(/skip to main content/i);

    await page.keyboard.press('Enter');
    const focusedTagAfterActivate = await page.evaluate(
      () => document.activeElement?.tagName ?? ''
    );
    expect(focusedTagAfterActivate.toLowerCase()).toBe('main');
  });

  test('surah card on the library is keyboard-activatable', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /choose a surah to recite/i }).waitFor();

    const surahLink = page.getByRole('link', { name: /al-fatihah/i }).first();
    await surahLink.focus();
    await expect(surahLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/practice\/1\/1$/);
  });

  test('mic button on the practice page is keyboard-activatable', async ({ page }) => {
    await page.goto('/practice/1/1');

    const mic = page.getByRole('button', { name: /start recording/i });
    await mic.focus();
    await expect(mic).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /^recording/i })).toBeVisible();
  });
});
