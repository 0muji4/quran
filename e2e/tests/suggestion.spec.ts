import { test, expect } from '../fixtures/page-fixtures';

/**
 * Suggested-card E2E (Phase 3.3, ADR 0015).
 *
 * Verifies that the Suggested-for-you card renders against the live
 * BFF /me/suggestions response (under MOCK_SESSION=true the mock user
 * is empty, so the endpoint picks the lowest-numeric short Meccan
 * surah from the unpracticed branch).
 *
 * Deliberately not asserting a specific surah id — the candidate pool
 * is derived from the seeded surahs table, which is intentionally
 * stable but not guaranteed against future quran-json reseeds. We
 * lock in the shape (a Begin link to /practice/{N}/1) instead so the
 * test stays valid across reseeds while still catching regressions
 * where the BFF call collapses to the local fallback.
 */

test.describe('Suggested card', () => {
  test('renders a Begin link pointing at a practice page', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    // The "Suggested for you" badge anchors us to the right card
    // (Continue and Surah cards do not contain that phrase).
    const badge = page.getByText(/suggested for you/i);
    await expect(badge).toBeVisible();

    // Walk up to the card container and grab the only Begin link
    // inside it. Looser ancestor matcher than the visual.spec.ts
    // structure-specific selector to absorb future DOM tweaks.
    const card = badge.locator('xpath=ancestor::*[self::div or self::article][1]');
    const beginLink = card.getByRole('link', { name: /begin/i });
    await expect(beginLink).toBeVisible();

    const href = await beginLink.getAttribute('href');
    // After ADR 0023, the href carries a locale prefix (e.g. `/en/practice/1/1`).
    expect(href).toMatch(/^\/(en|ar)\/practice\/\d+\/1$/);
  });

  test('shows a heading and difficulty label inside the card', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.verifyLoaded();

    const badge = page.getByText(/suggested for you/i);
    const card = badge.locator('xpath=ancestor::*[self::div or self::article][1]');

    // h2 holds the surah name; we don't pin it so we tolerate either
    // the BFF pick or the local fallback.
    await expect(card.getByRole('heading', { level: 2 })).toBeVisible();

    // Difficulty pill copy is one of Easy / Medium / Hard regardless of
    // whether the BFF responded with a per-user signal or we fell back
    // to the ayah-count heuristic.
    await expect(card.getByText(/^(Easy|Medium|Hard)$/)).toBeVisible();
  });
});
