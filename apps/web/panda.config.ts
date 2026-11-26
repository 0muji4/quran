import { defineConfig } from '@pandacss/dev';
import { colorRoles, shape, spacing } from '@quran-project/ui/theme/generated';
import { recipes } from '@quran-project/ui/theme/recipes';
import { fonts, textStyles } from '@quran-project/ui/theme/typography';
import { elevation, roundedShape } from '@quran-project/ui/theme/platform';
import { globalCss } from '@quran-project/ui/theme/global-css';

// preflight is off because globals.css owns the reset. strictTokens and
// strictPropertyValues keep every style on the tokens below.
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
    // The generated tokens (ADR 0026), with the values each platform keeps
    // for itself: the fully rounded shape, elevation and type (ADR 0032).
    tokens: {
      spacing,
      radii: { ...shape, ...roundedShape },
      fonts,
      shadows: elevation
    },
    semanticTokens: { colors: colorRoles },
    textStyles,
    recipes,
    // Material 3 window size classes (ADR 0032): compact is the base, below
    // 600px.
    breakpoints: {
      medium: '600px',
      expanded: '840px',
      large: '1200px',
      extraLarge: '1600px'
    }
  },
  globalCss
});
