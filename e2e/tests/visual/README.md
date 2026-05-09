# Visual regression tests

These specs guard the Tilawah brand visuals against unintended drift.
Each test renders a deterministic UI state (with `localStorage` seeded
via `addInitScript`) and compares the rendered page against a committed
baseline `.png` stored under `visual.spec.ts-snapshots/`.

## Status

Phase 3.4-A scaffolds three desktop scenes at 1280x720:

- Library landing — with the `Continue` card hydrated from a seeded
  `tilawah:last-practiced` entry
- History — with three seeded attempts (two completed, one failed) in
  `tilawah:recent-attempts`
- Practice idle — `/practice/1/1` in its ready-to-record state

The describe block is currently `test.fixme()`-guarded, so the suite is
green-by-design until the baseline `.png` files have been generated on
Linux Chromium (matching CI) and committed. Phase 3.4-B will add the
recording and result scenes.

## Generating baselines

Pixel rendering differs between macOS and Linux Chromium even at the
same viewport, so baselines must come from Linux Chromium. The simplest
way is to run Playwright inside the official `mcr.microsoft.com/playwright`
Docker image, attached to the dev stack's compose network so it can
reach the prod-ish `web` service rather than a `pnpm dev` host process.

1. **Free port 3000 on the host.** If `pnpm dev` is running, stop it so
   the compose `web` service can bind `:3000`. The compose `web` service
   builds the production Next.js image (`apps/web/Dockerfile`); CI also
   runs against the production build. Generating baselines against
   `pnpm dev` will not match CI byte-for-byte because dev-mode and
   prod-mode font / asset loading differ at the sub-pixel level.

2. **Build and start `web` from the current source.** The image cache
   may be stale (the Tilawah redesign in PR #87 moved many surfaces),
   so always pass `--build`:
   ```bash
   docker compose -f ops/docker/compose.dev.yml up -d --wait --build web
   ```

3. **Generate snapshots through Playwright Docker** on the compose
   network so it resolves `web:3000` directly. Use the same Playwright
   version as the project (currently 1.57.0). `CI=1` skips the
   compose-managed webServer block in `playwright.config.ts`:
   ```bash
   docker run --rm \
     --network=docker_default \
     -v "$(pwd):/work" \
     -w /work \
     -e E2E_BASE_URL=http://web:3000 \
     -e CI=1 \
     mcr.microsoft.com/playwright:v1.57.0-jammy \
     bash -lc "npx playwright test e2e/tests/visual/ --update-snapshots --project=chromium-desktop"
   ```
   The image already has `@playwright/test` baked in, so `pnpm install`
   is not required.

4. **Enable the suite if it is currently fixme'd.** Drop the
   describe-level `test.fixme()` line from `visual.spec.ts`.

5. **Commit.** Add the changed `*.png` files under
   `e2e/tests/visual/visual.spec.ts-snapshots/` and the spec change in
   a single PR. Keep that PR snapshot-only so reviewers can focus on
   the image diff.

If CI later reports unexpected pixel drift, the most likely root cause
is that the baselines were regenerated outside Linux Chromium. Re-run
step 3.

## Adding a new scene

Each scene is a single `test()` in `visual.spec.ts`. The conventions:

- Seed `localStorage` via `context.addInitScript` so the scene is
  reproducible without hitting the BFF.
- Wait on a stable role-based heading before snapshotting so the DOM
  has hydrated.
- Always call `stableSnapshot(page)` before `toHaveScreenshot()` to lock
  fonts.ready and disable animation.
- Use `fullPage: true` for routes whose value lies in their layout
  (library, history, result); the default viewport snapshot is fine for
  card-shaped routes.
- Set `maxDiffPixels: 200` as a starting threshold; bump per-scene only
  when a diff is genuinely below visual perception.

After adding the scene, regenerate snapshots (steps above) and commit
the spec change plus the new `.png` together.
