import { defineConfig } from '@pandacss/dev';
import { tokens } from '@quran-project/ui/theme/tokens';

// preflight is off because globals.css owns the reset. strictTokens is
// what locks in ADR 0003 (no `color: 'gold'` without an axis). Recipes
// land in PR 4+; for now the theme has colors only and no recipes.
export default defineConfig({
  preflight: false,
  jsxFramework: 'react',
  jsxStyleProps: 'minimal',
  strictTokens: true,
  strictPropertyValues: true,
  hash: false,
  include: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  exclude: ['**/*.module.css'],
  outdir: 'styled-system',
  theme: {
    tokens
  }
});
