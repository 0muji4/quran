import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Axe-core a11y baseline.
 *
 * Originally scaffolded in Phase 2.3-A with an allow-list of pre-existing
 * violations that 2.3-B〜E were expected to retire one by one. After
 * those PRs (#142–#146) all merged, the only rule that still fires is
 * page-has-heading-one on /practice/[s]/[a]. Everything else is now
 * enforced.
 *
 * If a future change reintroduces a previously-fixed rule, the test
 * fails loudly with the rule ID and helpUrl rather than silently
 * accepting the regression.
 */

// All previously allow-listed rules have been retired. Any new
// violation surfaces as a hard CI failure with the rule ID and helpUrl.
// If a future audit cycle catalogues a new pre-existing rule that
// should land before being fixed, add it here with a comment naming
// the PR that retires it.
const KNOWN_VIOLATIONS: readonly string[] = [];

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
