import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Axe-core a11y baseline.
 *
 * Phase 2.3-A scaffolds @axe-core/playwright for the Tilawah web app.
 * The 2026-05-09 audit (docs/web-tilawah-followups.md §2.3) catalogued
 * pre-existing violations that the subsequent sub-PRs (2.3-B〜E) will
 * address one rule at a time. Until each fix lands, axe rule IDs in
 * KNOWN_VIOLATIONS are accepted; any *new* rule firing on these routes
 * will fail the test, locking in regression detection from day one.
 *
 * As 2.3-B〜E land, remove the corresponding IDs from KNOWN_VIOLATIONS
 * so axe enforces them going forward. The TODO map below tracks which
 * sub-PR is expected to retire each ID.
 */

// Rule IDs the 2026-05-09 audit expects to be flagged on at least one
// route until the linked sub-PR lands. Keep this list in sync with the
// 完了状況 table in docs/web-tilawah-followups.md §2.3.
const KNOWN_VIOLATIONS = [
  // → fixed by 2.3-C (TopNav role=tablist on Link, TeacherPanel speed pills)
  'aria-allowed-role',
  'aria-required-children',
  // → fixed by 2.3-C (HistoryList semantic ul/li)
  'list',
  // → fixed by 2.3-D (--color-ink-on-dark-mut + --color-ink-muted contrast bumps)
  'color-contrast',
  // → fixed by 2.3-E (skip-to-content link + main landmark)
  'region',
  'landmark-one-main',
  // /practice/[s]/[a] currently has no h1 (only RecorderPanel and
  // TeacherPanel h3s). Library and History both already have an h1.
  // Promoting one of the practice headings to h1 is a heading-hierarchy
  // decision that should be made deliberately, not as a side-effect of
  // this baseline; tracked separately.
  'page-has-heading-one'
] as const;

const KNOWN = new Set<string>(KNOWN_VIOLATIONS);

const ROUTES = [
  { name: 'library', path: '/' },
  { name: 'practice', path: '/practice/1/1' },
  { name: 'history', path: '/history' },
];

test.describe('axe a11y baseline', () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no unexpected a11y violations`, async ({
      page,
    }) => {
      await page.goto(route.path);
      // Wait for the route's main heading so axe scans a hydrated DOM.
      await page.getByRole('heading').first().waitFor({ state: 'visible' });

      const results = await new AxeBuilder({ page }).analyze();
      const unexpected = results.violations.filter((v) => !KNOWN.has(v.id));

      expect(
        unexpected,
        unexpected.length > 0
          ? `Unexpected axe violations on ${route.path}: ${unexpected
              .map((v) => `${v.id} (${v.help})`)
              .join(', ')}`
          : 'no unexpected violations'
      ).toEqual([]);
    });
  }
});
