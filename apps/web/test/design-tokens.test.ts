import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Web reads only the generated tokens of ADR 0026 (#673). Panda's
// strictTokens rejects an old token name in css(), but a CSS variable in a
// stylesheet or a string, such as `var(--colors-bg-page)`, gets past it.
// This test fails when a source names a token of the hand-written set that
// the redesign removed.
// Vitest gives each test file its own __dirname.
const repoRoot = join(__dirname, '..', '..', '..');
const roots = ['apps/web/app', 'apps/web/i18n', 'packages/ui/src'];

const OLD_TOKEN =
  /--(colors-(gold|bg|ink|green|mint|tan|red|border|score)|fonts-(serif|sans|arabic)|radii-(xs|sm|md|lg|pill)|shadows-card)\b|theme\/tokens['"]/;

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(css|ts|tsx|mjs)$/.test(name) ? [path] : [];
  });

describe('design tokens', () => {
  it('names no token of the hand-written set the redesign removed', () => {
    const files = roots.flatMap((root) => sources(join(repoRoot, root)));
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((file) => OLD_TOKEN.test(readFileSync(file, 'utf8')))
      .map((file) => relative(repoRoot, file));
    expect(offenders).toEqual([]);
  });
});
