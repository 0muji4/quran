import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression baseline.
 *
 * Phase 3.4-A scaffolds Playwright `toHaveScreenshot()` for the Tilawah
 * web app. This spec covers three deterministic scenes (library with a
 * populated Continue card, history with seeded attempts, and the
 * practice page in its idle state). Phase 3.4-B will add the harder
 * recording and result scenes.
 *
 * The tests are deliberately fixme-guarded until the baseline `.png`
 * files have been generated on Linux Chromium (matching CI) and
 * committed under `visual.spec.ts-snapshots/`. See README.md in this
 * directory for the generation workflow. Once the baselines land, drop
 * the `test.fixme()` in the describe block and the suite enforces.
 */

const VIEWPORT = { width: 1280, height: 720 };

const SEEDED_LAST_PRACTICED = {
  surahId: '1',
  ayahNumber: 3,
  surahNameEn: 'Al-Fatihah',
  surahNameAr: 'الفاتحة',
  ayahCount: 7,
  practicedAt: '2026-05-08T10:00:00.000Z'
};

const SEEDED_ATTEMPTS = [
  {
    id: 'visual-1',
    surahId: '1',
    surahNameEn: 'Al-Fatihah',
    ayahNumber: 1,
    score: 92,
    jobId: 'visual-1',
    createdAt: '2026-05-08T10:00:00.000Z',
    status: 'COMPLETED' as const,
    durationMs: 4200
  },
  {
    id: 'visual-2',
    surahId: '1',
    surahNameEn: 'Al-Fatihah',
    ayahNumber: 2,
    score: 78,
    jobId: 'visual-2',
    createdAt: '2026-05-08T09:50:00.000Z',
    status: 'COMPLETED' as const,
    durationMs: 5100
  },
  {
    id: 'visual-3',
    surahId: '1',
    surahNameEn: 'Al-Fatihah',
    ayahNumber: 3,
    score: null,
    jobId: 'visual-3',
    createdAt: '2026-05-08T09:30:00.000Z',
    status: 'FAILED' as const
  }
];

/**
 * Freeze every well-known source of pixel drift before snapshotting:
 * disable animations via `prefers-reduced-motion`, wait for web fonts
 * to finish loading, and yield long enough for layout to settle.
 */
const stableSnapshot = async (page: Page): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
};

test.use({ viewport: VIEWPORT });

test.describe('visual regression — desktop 1280x720', () => {
  test.fixme(
    true,
    'Baseline snapshots are not yet committed. Generate them on Linux ' +
      'Chromium (see e2e/tests/visual/README.md) and commit the *.png ' +
      'files under visual.spec.ts-snapshots/ to enable this suite.'
  );

  test('library landing with seeded Continue card', async ({ page, context }) => {
    await context.addInitScript((seed) => {
      window.localStorage.setItem('tilawah:last-practiced', JSON.stringify(seed));
    }, SEEDED_LAST_PRACTICED);

    await page.goto('/');
    await page.getByRole('heading', { name: /choose a surah to recite/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('library-with-continue.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });

  test('history with three seeded attempts', async ({ page, context }) => {
    await context.addInitScript((attempts) => {
      window.localStorage.setItem(
        'tilawah:recent-attempts',
        JSON.stringify({ attempts })
      );
    }, SEEDED_ATTEMPTS);

    await page.goto('/history');
    await page.getByRole('heading', { name: /recent attempts/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('history-three-attempts.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });

  test('practice page in its idle ready state', async ({ page }) => {
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-idle.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });
});
