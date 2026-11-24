import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression baseline.
 *
 * Phase 3.4-A scaffolded Playwright `toHaveScreenshot()` for the
 * Tilawah web app. 3.4-B activates the suite by committing the
 * Linux-generated baseline `.png` files for the three deterministic
 * static-state scenes — library, history, and practice idle.
 *
 * The recording scene used to be `test.fixme`'d: when generating
 * baselines through the Playwright Docker image with
 * `--network=docker_default` + `E2E_BASE_URL=http://web:3000`,
 * Chromium gates `navigator.mediaDevices` on secure contexts and
 * `web:3000` is not in the localhost / 127.0.0.1 / HTTPS allow-list,
 * so `MediaRecorder` reports unsupported and `recorder.start()`
 * errors out before the panel reaches Recording. The fix is to run
 * the Docker image with `--network=host` + `E2E_BASE_URL=http://localhost:3000`,
 * matching what CI already does in `.github/workflows/e2e.yml`. See
 * `README.md` § "Generating baselines" for the updated command.
 *
 * The Done / Result scene used to be deferred for the same reason —
 * Server Components fetch the scoring job on render, so a Playwright
 * `page.route()` mock cannot reach them. Phase 3.4-B-result added the
 * deterministic `scoring_jobs` + `asr_results` rows in `db/seed.sql`
 * (`session_id = 'visual-baseline-fatihah-1'`) so the page renders the
 * same COMPLETED layout on every CI run. The scene is now active below.
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

/**
 * Wait until the teacher recitation's metadata has loaded on the practice
 * page. Until then the play button is disabled and the time reads 0:00 / 0:00,
 * so a capture taken earlier would depend on network timing.
 */
const teacherAudioReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const audio = document.querySelector('audio');
    return audio !== null && audio.readyState >= 1 && audio.duration > 0;
  });
};

test.use({ viewport: VIEWPORT });

test.describe('visual regression — desktop 1280x720', () => {
  test.skip('library landing with seeded Continue card (signed-in path)', async ({
    page,
    context
  }) => {
    // Re-enable when the signed-in Playwright fixture lands. Continue
    // and History data are account-scoped — anonymous localStorage
    // seeding no longer surfaces in the rendered card.
    await context.addInitScript((seed) => {
      window.localStorage.setItem('tilawah:last-practiced', JSON.stringify(seed));
    }, SEEDED_LAST_PRACTICED);

    await page.goto('/');
    await page.getByRole('heading', { level: 1, name: 'Library' }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('library-with-continue.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });

  // Signed out: no session is seeded, so the first card offers to start.
  // Captured at the window's height; the list below it is every surah.
  test('library landing for a guest', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { level: 1, name: 'Library' }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('library.png', { maxDiffPixels: 200 });
  });

  // The rebuilt library page follows the system colour scheme and the window
  // size class (ADR 0032).
  test('library landing for a guest in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.getByRole('heading', { level: 1, name: 'Library' }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('library-dark.png', { maxDiffPixels: 200 });
  });

  test('library landing for a guest in a compact window', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('heading', { level: 1, name: 'Library' }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('library-compact.png', { maxDiffPixels: 200 });
  });

  test.skip('history with three seeded attempts (signed-in path)', async ({ page, context }) => {
    // Re-enable when the signed-in Playwright fixture lands.
    await context.addInitScript((attempts) => {
      window.localStorage.setItem('tilawah:recent-attempts', JSON.stringify({ attempts }));
    }, SEEDED_ATTEMPTS);

    // History rows render a relative-time fragment ("Just now", "5h
    // ago", "2d ago", ...) computed from `Date.now()` against each
    // seeded createdAt. Without freezing the clock the rendered text
    // depends on when the test runs, which silently drifts the
    // baseline. Pin the clock to a moment a few hours after the
    // latest seeded attempt so the rendered offsets are stable.
    await page.clock.setFixedTime(new Date('2026-05-08T15:00:00.000Z'));

    await page.goto('/history');
    await page.getByRole('region', { name: 'Attempts' }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('history-three-attempts.png', {
      fullPage: true,
      maxDiffPixels: 200
    });
  });

  // Signed out, History explains that it needs an account.
  test('history for a guest', async ({ page }) => {
    await page.goto('/history');
    await page.getByRole('heading', { name: /sign in to track/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('history.png', { maxDiffPixels: 200 });
  });

  test('history for a guest in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/history');
    await page.getByRole('heading', { name: /sign in to track/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('history-dark.png', { maxDiffPixels: 200 });
  });

  test('history for a guest in a compact window', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/history');
    await page.getByRole('heading', { name: /sign in to track/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('history-compact.png', { maxDiffPixels: 200 });
  });

  test('practice page in its idle ready state', async ({ page }) => {
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();
    await teacherAudioReady(page);
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-idle.png', {
      fullPage: true,
      maxDiffPixels: 200,
      // The "Last attempt: N / 100 · {when}" footer ends in a relative
      // time ("yesterday", "2 days ago") computed from Date.now(), so it
      // drifts daily and would make this baseline flaky. Mask it the same
      // way the result scene masks its async-duration player.
      mask: [page.locator('[data-testid="last-attempt"]')]
    });
  });

  test('practice page result view (seeded COMPLETED job)', async ({ page }) => {
    // The seeded job lives at db/seed.sql; see the file header
    // comment for the rationale. Route is the canonical path-based
    // result URL added in PR #127.
    await page.goto('/practice/1/1/result/visual-baseline-fatihah-1');

    // ResultDetail renders an AutoFocusHeading h1 with the verdict
    // headline (`verdictForScore(score).headline`). Seeded score 0.86
    // maps to "Beautifully recited" — pin to that so the snapshot waits
    // for server-rendered HTML + h1 focus side-effect to settle.
    await page.getByRole('heading', { level: 1, name: /beautifully recited/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-result.png', {
      fullPage: true,
      // Listen back shows each recording's duration once its audio
      // metadata loads, which depends on timing, so mask the durations and
      // let only the deterministic layout (score dial, metrics,
      // word-by-word) drive the diff. This is the busiest scene (dial
      // arc + metric bars + word tiles + Arabic), so it carries the
      // most cross-environment anti-aliasing drift (~900px observed
      // between the Docker baseline host and CI); keep the threshold
      // generous enough to absorb it while still catching real changes.
      maxDiffPixels: 2000,
      mask: [page.locator('[data-testid="listen-back-duration"]')]
    });
  });

  // The rebuilt result page follows the system colour scheme and the window
  // size class too (ADR 0032).
  test('practice page result view in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/practice/1/1/result/visual-baseline-fatihah-1');
    await page.getByRole('heading', { level: 1, name: /beautifully recited/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-result-dark.png', {
      fullPage: true,
      maxDiffPixels: 2000,
      mask: [page.locator('[data-testid="listen-back-duration"]')]
    });
  });

  test('practice page result view in a compact window', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/1/1/result/visual-baseline-fatihah-1');
    await page.getByRole('heading', { level: 1, name: /beautifully recited/i }).waitFor();
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-result-compact.png', {
      fullPage: true,
      maxDiffPixels: 2000,
      mask: [page.locator('[data-testid="listen-back-duration"]')]
    });
  });

  test('practice page during active recording', async ({ page }) => {
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();

    // Trigger recording. CI launchOptions enable
    // --use-fake-ui-for-media-stream + --use-fake-device-for-media-stream
    // so the mic permission is auto-granted and a synthetic audio
    // stream backs MediaRecorder.
    await page.getByRole('button', { name: /start recording/i }).click();
    await page.getByRole('heading', { name: /^recording/i }).waitFor();
    await teacherAudioReady(page);
    await stableSnapshot(page);

    // Two regions are inherently non-deterministic and must be masked:
    //   - The mm:ss timer ticks once per second.
    //   - The waveform bars are driven by live mic levels from the
    //     fake stream and vary frame to frame.
    await expect(page).toHaveScreenshot('practice-recording.png', {
      fullPage: true,
      maxDiffPixels: 300,
      mask: [
        page.locator('[data-testid="recording-timer"]'),
        page.locator('[data-testid="recording-waveform"]')
      ]
    });
  });

  // The rebuilt practice page follows the system colour scheme and the
  // window size class (ADR 0032), so it is also captured in dark mode and in
  // a compact window, where the navigation is a bottom bar.
  test('practice page in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();
    await teacherAudioReady(page);
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-idle-dark.png', {
      fullPage: true,
      maxDiffPixels: 200,
      mask: [page.locator('[data-testid="last-attempt"]')]
    });
  });

  test('practice page in a compact window', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/1/1');
    await page.getByRole('heading', { name: /now you recite/i }).waitFor();
    await teacherAudioReady(page);
    await stableSnapshot(page);

    await expect(page).toHaveScreenshot('practice-idle-compact.png', {
      fullPage: true,
      maxDiffPixels: 200,
      mask: [page.locator('[data-testid="last-attempt"]')]
    });
  });
});
