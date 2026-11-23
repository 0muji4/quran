import { defineTokens } from '@pandacss/dev';

// Web values that ADR 0026 leaves to each platform: elevation and the fully
// rounded shape. They follow Material 3, as Android does (ADR 0032).

/** Material 3 elevation levels 1 to 5, as box shadows. */
export const elevation = defineTokens.shadows({
  level1: { value: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)' },
  level2: { value: '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)' },
  level3: { value: '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)' },
  level4: { value: '0 2px 3px rgba(0, 0, 0, 0.3), 0 6px 10px 4px rgba(0, 0, 0, 0.15)' },
  level5: { value: '0 4px 4px rgba(0, 0, 0, 0.3), 0 8px 12px 6px rgba(0, 0, 0, 0.15)' }
});

/** The fully rounded shape (Material 3 `full`) for pills and circles. */
export const roundedShape = defineTokens.radii({
  full: { value: '9999px' }
});
