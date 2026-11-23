import { defineTextStyles, defineTokens } from '@pandacss/dev';

// Type for the Web redesign (ADR 0032). Type stays per platform (ADR 0026),
// so these values are written by hand rather than generated.

/** The system font for UI text, and the bundled Amiri subset for Quran text. */
export const fonts = defineTokens.fonts({
  ui: {
    value:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Arabic", sans-serif'
  },
  quran: { value: 'var(--font-amiri), "Amiri", serif' }
});

const rem = (px: number) => `${px / 16}rem`;

const style = (size: number, lineHeight: number, weight: 400 | 500, tracking: number) => ({
  value: {
    fontFamily: 'ui',
    fontSize: rem(size),
    lineHeight: rem(lineHeight),
    fontWeight: weight,
    letterSpacing: rem(tracking)
  }
});

/**
 * The Material 3 type scale, in rem so that it follows the browser's text
 * size, plus the Quran styles of ADR 0028. Line height and layout of an ayah
 * belong to the ayah component.
 */
export const textStyles = defineTextStyles({
  displayLarge: style(57, 64, 400, -0.25),
  displayMedium: style(45, 52, 400, 0),
  displaySmall: style(36, 44, 400, 0),
  headlineLarge: style(32, 40, 400, 0),
  headlineMedium: style(28, 36, 400, 0),
  headlineSmall: style(24, 32, 400, 0),
  titleLarge: style(22, 28, 400, 0),
  titleMedium: style(16, 24, 500, 0.15),
  titleSmall: style(14, 20, 500, 0.1),
  bodyLarge: style(16, 24, 400, 0.5),
  bodyMedium: style(14, 20, 400, 0.25),
  bodySmall: style(12, 16, 400, 0.4),
  labelLarge: style(14, 20, 500, 0.1),
  labelMedium: style(12, 16, 500, 0.5),
  labelSmall: style(11, 16, 500, 0.5),
  quran: {
    ayah: { value: { fontFamily: 'quran', fontSize: rem(34), fontWeight: 400 } },
    ayahLong: { value: { fontFamily: 'quran', fontSize: rem(28), fontWeight: 400 } },
    ayahNumber: {
      value: { fontFamily: 'quran', fontSize: rem(20), fontWeight: 400, lineHeight: 1 }
    }
  }
});
