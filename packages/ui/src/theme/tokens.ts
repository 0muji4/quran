import { defineTokens } from '@pandacss/dev';

// ADR 0003 splits the gold token by usage axis. There is intentionally
// no `gold.DEFAULT` — `color: 'gold'` (no axis) must be a TypeScript
// error so future component authors are forced to pick the right axis:
//   surface  → backgrounds (.btnGold bg, .progressFill, decorative SVG)
//   onLight  → gold *text* on cream / paper (must clear WCAG AA)
//   onDark   → gold *text* on dark surfaces (continue card, nav)
export const tokens = defineTokens({
  colors: {
    gold: {
      surface: { value: '#b8893c' },
      onLight: { value: '#6e4f1e' },
      onDark: { value: '#d9b26a' }
    },
    bg: {
      page: { value: '#f5f0e5' },
      paper: { value: '#ffffff' },
      paperSoft: { value: '#faf6ec' },
      nav: { value: '#1f1a14' },
      continue: { value: '#2b1f14' },
      recording: { value: '#14181c' },
      brandDark: { value: '#221814' }
    },
    ink: {
      strong: { value: '#1f1a14' },
      default: { value: '#3a322a' },
      muted: { value: '#6b5d4a' },
      onDark: { value: '#efe4ce' },
      onDarkMut: { value: '#d4c4a4' }
    },
    teal: {
      DEFAULT: { value: '#2d5a4f' },
      deep: { value: '#1f4036' }
    },
    mint: {
      bg: { value: '#d9efe3' },
      ink: { value: '#2d5a4f' }
    },
    tan: {
      DEFAULT: { value: '#e8d9b8' },
      soft: { value: '#f3ead4' }
    },
    red: {
      DEFAULT: { value: '#c0392b' },
      soft: { value: '#e74c3c' }
    },
    border: {
      DEFAULT: { value: '#e5dcc9' },
      strong: { value: '#b8893c' }
    }
  },
  // 4px base, matches the --space-N scale globals.css has shipped with.
  spacing: {
    '1': { value: '4px' },
    '2': { value: '8px' },
    '3': { value: '12px' },
    '4': { value: '16px' },
    '5': { value: '20px' },
    '6': { value: '24px' },
    '8': { value: '32px' },
    '10': { value: '40px' },
    '12': { value: '48px' }
  },
  radii: {
    xs: { value: '6px' },
    sm: { value: '10px' },
    md: { value: '14px' },
    lg: { value: '20px' },
    pill: { value: '999px' }
  },
  shadows: {
    card: { value: '0 8px 24px rgba(40, 28, 12, 0.06)' },
    cardHover: { value: '0 14px 32px rgba(40, 28, 12, 0.1)' }
  },
  // Font tokens reference the next/font CSS variables wired in
  // app/layout.tsx (--font-cormorant / --font-inter / --font-amiri).
  fonts: {
    serif: {
      value: 'var(--font-cormorant), "Cormorant Garamond", "Times New Roman", Georgia, serif'
    },
    sans: {
      value: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    arabic: {
      value: 'var(--font-amiri), "Amiri", "Scheherazade New", serif'
    }
  }
});
