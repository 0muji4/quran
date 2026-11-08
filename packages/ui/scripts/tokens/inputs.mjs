// Layer 1, design inputs: the decisions a designer edits. Every file under
// packages/ui/tokens/ is generated from these values (ADR 0026). This module
// holds data only.

// Brand seed colours ("Lapis and gold").
export const SEEDS = {
  // Lapis lazuli blue: primary actions and selection.
  primary: '#1E4F91',
  // Illumination gold: tertiary accents and the ornament role.
  tertiary: '#B8893C',
  // Verdict hue for a correct recitation.
  pass: '#2E7D32',
  // Verdict hue for a recitation that needs attention.
  warn: '#B26A00'
};

// Chroma limits. The secondary palette is a quiet tint of the primary hue.
// Verdict chroma is capped so that the pale container tones do not turn neon.
export const CHROMA = { secondary: 16, pass: 36, warn: 40 };

// Neutrals carry a warm paper hue.
export const NEUTRAL = { hue: 75, chroma: 6 };
export const NEUTRAL_VARIANT = { hue: 75, chroma: 10 };

// Spacing steps on a 4px grid, as step → px.
export const SPACING = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
};

// Corner radii on the Material 3 shape scale, in px. Pill shapes use the
// platform's own fully rounded shape (CircleShape on Android, Capsule on iOS).
export const SHAPE = { none: 0, extraSmall: 4, small: 8, medium: 12, large: 16, extraLarge: 28 };
