import { defineConfig } from '@pandacss/dev';
import { tokens } from '@quran-project/ui/theme/tokens';
import { colorRoles, shape, spacing } from '@quran-project/ui/theme/generated';
import { recipes, slotRecipes } from '@quran-project/ui/theme/recipes';
import { fonts, textStyles } from '@quran-project/ui/theme/typography';
import { globalCss } from '@quran-project/ui/theme/global-css';

// preflight is off because globals.css owns the reset. strictTokens is
// what locks in ADR 0003 (no `color: 'gold'` without an axis). Recipes
// land in PR 4+; for now the theme has colors only and no recipes.
export default defineConfig({
  // Panda adds no presets by default. preset-panda stays out so its tokens never
  // pass strictTokens.
  presets: ['@pandacss/preset-base'],
  preflight: false,
  jsxFramework: 'react',
  jsxStyleProps: 'minimal',
  strictTokens: true,
  strictPropertyValues: true,
  hash: false,
  include: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  exclude: ['**/*.module.css'],
  outdir: 'styled-system',
  // Colour roles take their `_dark` values when the operating system is in
  // dark mode (ADR 0032).
  conditions: {
    extend: {
      dark: '@media (prefers-color-scheme: dark)'
    }
  },
  theme: {
    // The generated tokens (ADR 0026) sit next to the hand-written ones until
    // every screen has moved to them. Spacing has the same steps and values
    // in both, so it comes from the generated set only.
    tokens: {
      ...tokens,
      spacing,
      radii: { ...tokens.radii, ...shape },
      fonts: { ...tokens.fonts, ...fonts }
    },
    semanticTokens: { colors: colorRoles },
    textStyles,
    recipes,
    slotRecipes,
    // Material 3 window size classes (ADR 0032): compact is the base, below
    // 600px. The rest match the @media widths the old CSS modules use (nav
    // 600, library 640/900, history 720, practice 720/760) and go with them.
    breakpoints: {
      sm: '600px',
      medium: '600px',
      md: '640px',
      lg: '720px',
      xl: '760px',
      expanded: '840px',
      '2xl': '900px',
      large: '1200px',
      extraLarge: '1600px'
    }
  },
  globalCss
});
