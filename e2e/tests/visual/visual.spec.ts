import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression baseline.
 *
 * Phase 3.4-A scaffolded Playwright `toHaveScreenshot()` for the
 * Tilawah web app. 3.4-B activates the suite by committing the
 * Linux-generated baseline `.png` files for the three deterministic
 * static-state scenes — library, history, and practice idle.
 *
 * The recording scene is sketched below but currently fixme'd: in the
 * Playwright Docker image used to generate baselines locally,
 * `MediaRecorder` reports as unsupported even with the chromium-desktop
 * project's `--use-fake-device-for-media-stream` launch flag, so
 * `recorder.start()` errors out before the panel reaches the
 * "Recording" state. The CI image (Playwright via `--with-deps`) does
 * not have this problem (existing `recording-flow.spec.ts` exercises
 * the same path), so the scene can be enabled once we figure out the
 * Docker-image gap. Tracked separately.
 *
 * The Done / Result scene is also deferred — Server Components fetch
 * the scoring job on render, so a Playwright `page.route()` mock
 * cannot reach them. A deterministic seeded `scoring_jobs` row in
 * `db/seed.sql` is the cleanest fix.
 *
 * If a future change drifts the rendering, the test fails with a
 * side-by-side image comparison under `playwright-report/`. Regenerate
 * baselines on Linux Chromium per `README.md` if the change is
 * intentional.
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

  test('practice page during active recording', async ({ page }) => {
    test.fixme(
      true,
      'MediaRecorder reports as unsupported inside the Playwright Docker ' +
        'image used to regenerate baselines locally, so recorder.start() ' +
        'errors out before the panel reaches the "Recording" state. ' +
        'Investigation pending; tracked separately.'
    );
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();

    // Trigger recording. CI launchOptions enable
    // --use-fake-ui-for-media-stream + --use-fake-device-for-media-stream
    // so the mic permission is auto-granted and a synthetic audio
    // stream backs MediaRecorder.
    await page.getByRole('button', { name: /start recording/i }).click();
    await page.getByRole('heading', { name: /^recording/i }).waitFor();
    await stableSnapshot(page);

    // Two regions are inherently non-deterministic and must be masked:
    //   - The mm:ss timer ticks once per second.
    //   - The waveform bars are driven by live mic levels from the
    //     fake stream and vary frame to frame.
    // Class names are CSS-modules hashed (e.g. practice_recordingTimer__abc),
    // so we match by `class*="..."` substring rather than exact equality.
    await expect(page).toHaveScreenshot('practice-recording.png', {
      fullPage: true,
      maxDiffPixels: 300,
      mask: [
        page.locator('[class*="recordingTimer"]'),
        page.locator('[class*="recorderBars"]')
      ]
    });
  });
});
