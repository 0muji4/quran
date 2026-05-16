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
  }
});
