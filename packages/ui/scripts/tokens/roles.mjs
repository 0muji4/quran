// The colour role vocabulary: which roles exist, how the app-specific roles
// map onto palettes, and which roles are drawn as text on which. This module
// holds data only.

// Material 3 colour roles, in the order Compose's `lightColorScheme` takes them.
export const MATERIAL_ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'surfaceTint',
  'inverseSurface',
  'inverseOnSurface',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'outline',
  'outlineVariant',
  'scrim',
  'surfaceBright',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'surfaceContainerLow',
  'surfaceContainerLowest',
  'surfaceDim'
];

// App-specific roles, as role → [palette, Material 3 role]. Each one takes the
// tones of the Material 3 role on its own palette, so it inherits that role's
// contrast in both modes.
export const APP_ROLES = {
  recording: ['error', 'error'],
  onRecording: ['error', 'onError'],
  pass: ['pass', 'primary'],
  onPass: ['pass', 'onPrimary'],
  passContainer: ['pass', 'primaryContainer'],
  onPassContainer: ['pass', 'onPrimaryContainer'],
  warn: ['warn', 'primary'],
  onWarn: ['warn', 'onPrimary'],
  warnContainer: ['warn', 'primaryContainer'],
  onWarnContainer: ['warn', 'onPrimaryContainer'],
  fail: ['error', 'error'],
  onFail: ['error', 'onError'],
  failContainer: ['error', 'errorContainer'],
  onFailContainer: ['error', 'onErrorContainer']
};

// Decorative gold for rules, borders and illumination. It never carries text
// or meaning, so it has no contrast pair.
export const ORNAMENT = { palette: 'tertiary', tones: { light: 60, dark: 70 } };

const SURFACES = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest'
];

// Text/background role pairs, as [text, background].
export const CONTRAST_PAIRS = [
  ['onPrimary', 'primary'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['onSecondary', 'secondary'],
  ['onSecondaryContainer', 'secondaryContainer'],
  ['onTertiary', 'tertiary'],
  ['onTertiaryContainer', 'tertiaryContainer'],
  ['onError', 'error'],
  ['onErrorContainer', 'errorContainer'],
  ['onSurfaceVariant', 'surfaceVariant'],
  ['inverseOnSurface', 'inverseSurface'],
  ['inversePrimary', 'inverseSurface'],
  ...SURFACES.flatMap((surface) => [
    ['onSurface', surface],
    ['onSurfaceVariant', surface],
    ['primary', surface]
  ]),
  ['onRecording', 'recording'],
  ['onPass', 'pass'],
  ['onPassContainer', 'passContainer'],
  ['onWarn', 'warn'],
  ['onWarnContainer', 'warnContainer'],
  ['onFail', 'fail'],
  ['onFailContainer', 'failContainer']
];
