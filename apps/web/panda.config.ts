import { defineConfig } from '@pandacss/dev';
import { tokens } from '@quran-project/ui/theme/tokens';
import { recipes } from '@quran-project/ui/theme/recipes';

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
    tokens,
    recipes,
    // Match the @media widths the existing CSS modules already use:
    // nav 600, library 640/900, history 720, practice 720/760.
    breakpoints: {
      sm: '600px',
      md: '640px',
      lg: '720px',
      xl: '760px',
      '2xl': '900px'
    }
  }
});
