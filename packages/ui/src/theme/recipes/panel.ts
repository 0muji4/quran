import { defineSlotRecipe } from '@pandacss/dev';

// Tilawah card / panel surface. Collapses .panel (practice),
// .continue, .suggested, .surahCard, and the auth brand panel into one
// slot recipe — the same six slots (badge / title / subtitle / body /
// footer / root) cover all of them; the `surface` variant swaps
// background + ink palette.
//
// Visual conventions captured here:
//  * paper / soft   — light cards with subtle border + card shadow.
//  * continue       — dark brand panel (Continue / Auth left side),
//                     no shadow, ink.onDark text, gold badge accent.
//
// Off-grid metrics ([11px], [0.18em], [4px], [12px], etc.) use Panda's
// bracket escape so the recipe matches the legacy CSS byte-for-byte
// during PR 7-10 migrations. Wider use of tokens can come later.
export const panel = defineSlotRecipe({
  className: 'panel',
  description: 'Card / panel surface used across library, practice, and auth.',
  slots: ['root', 'badge', 'title', 'subtitle', 'body', 'footer'],
  base: {
    root: {
      borderRadius: 'md',
      padding: '6',
      display: 'flex',
      flexDirection: 'column',
      gap: '4',
      position: 'relative',
      overflow: 'hidden'
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '[6px]',
      paddingInline: '[12px]',
      paddingBlock: '[4px]',
      borderRadius: 'pill',
      fontSize: '[11px]',
      fontWeight: 600,
      letterSpacing: '[0.18em]',
      textTransform: 'uppercase',
      width: 'fit-content'
    },
    title: {
      fontFamily: 'serif',
      fontSize: '[32px]',
      lineHeight: '[1.1]'
    },
    subtitle: {
      fontSize: '[15px]',
      lineHeight: '[1.5]'
    },
    body: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3'
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '3',
      marginTop: '2'
    }
  },
  variants: {
    surface: {
      paper: {
        root: {
          backgroundColor: 'bg.paper',
          color: 'ink.default',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'border',
          boxShadow: 'card'
        },
        badge: { backgroundColor: 'mint.bg', color: 'mint.ink' },
        title: { color: 'ink.strong' },
        subtitle: { color: 'ink.muted' }
      },
      soft: {
        root: {
          backgroundColor: 'bg.paperSoft',
          color: 'ink.default',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'border',
          boxShadow: 'card'
        },
        badge: { backgroundColor: 'mint.bg', color: 'mint.ink' },
        title: { color: 'ink.strong' },
        subtitle: { color: 'ink.muted' }
      },
      continue: {
        root: {
          backgroundColor: 'bg.continue',
          color: 'ink.onDark'
        },
        badge: {
          // ADR 0003: gold-on-dark axis only for text on the brown
          // surface. The legacy CSS used rgba()-tinted gold for both
          // bg and border; bracket escapes preserve that ratio.
          backgroundColor: '[rgba(184, 137, 60, 0.18)]',
          color: 'gold.onDark',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '[rgba(184, 137, 60, 0.4)]'
        },
        title: { color: 'ink.onDark' },
        subtitle: { color: 'ink.onDarkMut' }
      }
    }
  },
  defaultVariants: {
    surface: 'paper'
  }
});
