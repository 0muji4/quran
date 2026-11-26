import { defineRecipe } from '@pandacss/dev';
import type { RecipeConfig, SystemStyleObject } from '@pandacss/types';

// Recipes for HTML standard elements (ADR 0032), drawn with the Material 3
// colour roles of ADR 0026 at Material 3's default shapes and sizes. Each one
// styles an element as it is (`button`, `a`, `select`, `progress`, a
// container); the browser keeps its behaviour. Names start with `app`, like
// the Android and iOS components.
// Sizes are bracketed px: Panda's size properties do not read spacing tokens.

/** Interaction feedback: a state layer in the content colour, and a focus ring. */
const interactive: SystemStyleObject = {
  position: 'relative',
  isolation: 'isolate',
  cursor: 'pointer',
  textDecoration: 'none',
  WebkitTapHighlightColor: 'transparent',
  _before: {
    content: '""',
    position: 'absolute',
    inset: '0',
    borderRadius: 'inherit',
    background: 'currentColor',
    opacity: 0,
    zIndex: -1,
    transition: 'opacity 0.15s ease',
    pointerEvents: 'none'
  },
  _hover: { _before: { opacity: 0.08 } },
  _active: { _before: { opacity: 0.1 } },
  _focusVisible: {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]'
  },
  _disabled: { opacity: 0.38, cursor: 'default', _before: { opacity: 0 } },
  '&[aria-disabled=true]': { opacity: 0.38, cursor: 'default', pointerEvents: 'none' }
};

/** Common buttons: filled, tonal, outlined, text, and filled in the error colour. */
export const appButton: RecipeConfig = defineRecipe({
  className: 'appButton',
  description: 'Material 3 common button on a button or link element.',
  base: {
    ...interactive,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    minHeight: '[40px]',
    paddingInline: '6',
    borderRadius: 'full',
    borderWidth: '0',
    textStyle: 'labelLarge',
    whiteSpace: 'nowrap'
  },
  variants: {
    variant: {
      filled: { background: 'primary', color: 'onPrimary' },
      tonal: { background: 'secondaryContainer', color: 'onSecondaryContainer' },
      outlined: {
        background: 'transparent',
        color: 'primary',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant'
      },
      text: { background: 'transparent', color: 'primary', paddingInline: '3' },
      error: { background: 'error', color: 'onError' }
    }
  },
  defaultVariants: { variant: 'filled' }
});

/** Icon buttons: 40px visual in a 48px target. */
export const appIconButton: RecipeConfig = defineRecipe({
  className: 'appIconButton',
  description: 'Material 3 icon button on a button or link element.',
  base: {
    ...interactive,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '[40px]',
    height: '[40px]',
    margin: '1',
    borderRadius: 'full',
    borderWidth: '0',
    _after: { content: '""', position: 'absolute', inset: '[-4px]' }
  },
  variants: {
    variant: {
      standard: { background: 'transparent', color: 'onSurfaceVariant' },
      tonal: { background: 'secondaryContainer', color: 'onSecondaryContainer' }
    }
  },
  defaultVariants: { variant: 'standard' }
});

/** The large floating action button (96px, extra-large corners). */
export const appFab: RecipeConfig = defineRecipe({
  className: 'appFab',
  description: 'Material 3 large FAB on a button element.',
  base: {
    ...interactive,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '[96px]',
    height: '[96px]',
    borderRadius: 'extraLarge',
    borderWidth: '0',
    boxShadow: 'level3',
    _hover: { boxShadow: 'level4', _before: { opacity: 0.08 } }
  },
  variants: {
    tone: {
      primary: { background: 'primaryContainer', color: 'onPrimaryContainer' },
      error: { background: 'errorContainer', color: 'onErrorContainer' }
    }
  },
  defaultVariants: { tone: 'primary' }
});

/** Cards: elevated for the main card of a page, filled for panels, outlined. */
export const appCard: RecipeConfig = defineRecipe({
  className: 'appCard',
  description: 'Material 3 card on a container element.',
  base: {
    borderRadius: 'medium',
    color: 'onSurface'
  },
  variants: {
    variant: {
      elevated: { background: 'surfaceContainerLow', boxShadow: 'level1' },
      filled: { background: 'surfaceContainerHighest' },
      outlined: {
        background: 'surface',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'outlineVariant'
      }
    }
  },
  defaultVariants: { variant: 'filled' }
});

/** Assist and filter chips. A filter chip shows its selection with aria-pressed. */
export const appChip: RecipeConfig = defineRecipe({
  className: 'appChip',
  description: 'Material 3 chip on a button or link element.',
  base: {
    ...interactive,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    minHeight: '[32px]',
    paddingInline: '4',
    borderRadius: 'small',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'outlineVariant',
    background: 'transparent',
    color: 'onSurfaceVariant',
    textStyle: 'labelLarge',
    _pressed: {
      background: 'secondaryContainer',
      color: 'onSecondaryContainer',
      borderColor: 'transparent'
    }
  }
});

/** A list item that is a link or button: leading element, text, trailing element. */
export const appListItem: RecipeConfig = defineRecipe({
  className: 'appListItem',
  description: 'Material 3 two-line list item on a button or link element.',
  base: {
    ...interactive,
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    minHeight: '[72px]',
    paddingBlock: '2',
    paddingInline: '4',
    borderRadius: 'medium',
    color: 'onSurface'
  }
});

/** A select drawn as an outlined field. */
export const appSelect: RecipeConfig = defineRecipe({
  className: 'appSelect',
  description: 'Outlined select on a select element.',
  base: {
    ...interactive,
    appearance: 'none',
    // What the browser draws, such as the menu, follows the system setting.
    colorScheme: 'light dark',
    minHeight: '[32px]',
    paddingInlineStart: '3',
    paddingInlineEnd: '8',
    borderRadius: 'small',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'outlineVariant',
    backgroundColor: 'transparent',
    color: 'onSurface',
    textStyle: 'labelLarge',
    _hover: { borderColor: 'outline' }
  }
});

/** A switch, on a button with the switch role; aria-checked shows its state. */
export const appSwitch: RecipeConfig = defineRecipe({
  className: 'appSwitch',
  description: 'Material 3 switch on a button element with role=switch.',
  base: {
    ...interactive,
    flexShrink: 0,
    width: '[52px]',
    height: '[32px]',
    borderRadius: 'full',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'outline',
    background: 'surfaceContainerHighest',
    // The handle, which grows when the switch is on.
    _after: {
      content: '""',
      position: 'absolute',
      top: '[50%]',
      insetInlineStart: '[6px]',
      width: '[16px]',
      height: '[16px]',
      marginTop: '[-8px]',
      borderRadius: 'full',
      background: 'outline',
      transition: '[all 0.15s ease]',
      _motionReduce: { transition: 'none' }
    },
    '&[aria-checked=true]': {
      borderColor: 'primary',
      background: 'primary',
      _after: {
        insetInlineStart: '[22px]',
        width: '[24px]',
        height: '[24px]',
        marginTop: '[-12px]',
        background: 'onPrimary'
      }
    }
  }
});

/** A text input or a select drawn as an outlined text field. */
export const appTextField: RecipeConfig = defineRecipe({
  className: 'appTextField',
  description: 'Material 3 outlined text field on an input or select element.',
  base: {
    // What the browser draws, such as a menu or a picker's icon, follows the
    // system setting.
    colorScheme: 'light dark',
    width: '[100%]',
    minHeight: '[56px]',
    paddingInline: '4',
    borderRadius: 'extraSmall',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'outline',
    background: 'transparent',
    color: 'onSurface',
    textStyle: 'bodyLarge',
    _hover: { borderColor: 'onSurface' },
    // The outline thickens inwards, so the text does not move.
    _focusVisible: {
      outlineWidth: '[2px]',
      outlineStyle: 'solid',
      outlineColor: 'primary',
      outlineOffset: '[-2px]'
    },
    _disabled: { opacity: 0.38, cursor: 'default' }
  }
});

/** Linear progress on a progress element: a primary indicator on its track. */
export const appProgress: RecipeConfig = defineRecipe({
  className: 'appProgress',
  description: 'Material 3 linear progress on a progress element.',
  base: {
    appearance: 'none',
    display: 'block',
    width: '[100%]',
    height: '[4px]',
    borderWidth: '0',
    borderRadius: 'full',
    overflow: 'hidden',
    background: 'secondaryContainer',
    color: 'primary',
    '&::-webkit-progress-bar': { background: 'secondaryContainer', borderRadius: 'full' },
    '&::-webkit-progress-value': { background: 'primary', borderRadius: 'full' },
    '&::-moz-progress-bar': { background: 'primary', borderRadius: 'full' }
  }
});
