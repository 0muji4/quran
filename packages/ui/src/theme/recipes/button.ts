import { defineRecipe } from '@pandacss/dev';

// Tilawah brand button. Collapses .btnGhost / .btnGreen / .btnGold /
// .navBtn (and friends) into one tone × size matrix. ADR 0003 governs
// the gold case: surface bg + ink.strong text, hover lifts to onDark.
//
// Off-grid paddings/heights ([14px], [18px], etc.) use Panda's bracket
// escape so the Recipe matches the legacy CSS Modules byte-for-byte
// during migration; we are intentionally not forcing those values onto
// the 4px spacing scale.
export const button = defineRecipe({
  className: 'btn',
  description: 'Tilawah brand button. tone selects palette + weight; size selects metrics.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'pill',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
    _disabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  variants: {
    tone: {
      ghost: {
        background: 'transparent',
        color: 'ink.default',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border',
        fontWeight: 600,
        _hover: { borderColor: 'ink.muted' }
      },
      green: {
        background: 'green',
        color: 'bg.paper',
        fontWeight: 600,
        _hover: { background: 'green.deep' }
      },
      gold: {
        background: 'gold.surface',
        color: 'ink.strong',
        fontWeight: 600,
        _hover: { background: 'gold.onDark' }
      },
      nav: {
        background: 'bg.paper',
        color: 'ink.default',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border',
        fontWeight: 500,
        _hover: { borderColor: 'ink.muted' }
      }
    },
    size: {
      sm: {
        minHeight: '[32px]',
        paddingInline: '[14px]',
        paddingBlock: '[6px]',
        fontSize: '[13px]'
      },
      md: {
        minHeight: '[44px]',
        paddingInline: '[14px]',
        paddingBlock: '[8px]',
        fontSize: '[13px]'
      },
      lg: {
        minHeight: '[44px]',
        paddingInline: '[18px]',
        paddingBlock: '[10px]',
        fontSize: '[14px]'
      }
    }
  },
  defaultVariants: {
    tone: 'ghost',
    size: 'lg'
  }
});
