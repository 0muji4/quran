// Colour computation: builds the tonal palettes from the design inputs and
// resolves each colour role to a palette tone, per mode. Pure functions; no I/O.
//
// Material Color Utilities is pinned to 0.3.x: the 0.4.0 ESM build imports its
// own modules without file extensions, which Node cannot resolve.

import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  TonalPalette,
  argbFromHex,
  hexFromArgb
} from '@material/material-color-utilities';

import { CHROMA, NEUTRAL, NEUTRAL_VARIANT, SEEDS } from './inputs.mjs';
import { APP_ROLES, MATERIAL_ROLES, ORNAMENT } from './roles.mjs';

// Material 3's fixed error palette.
const ERROR = { hue: 25, chroma: 84 };

// Tones published in the primitive layer even when no role uses them, so a
// component can reach a standard step without changing the palette.
const STANDARD_TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];

const hueOf = (hex) => Hct.fromInt(argbFromHex(hex)).hue;

/** Returns the tonal palettes, keyed by palette name. */
export function buildPalettes() {
  return {
    primary: TonalPalette.fromInt(argbFromHex(SEEDS.primary)),
    secondary: TonalPalette.fromHueAndChroma(hueOf(SEEDS.primary), CHROMA.secondary),
    tertiary: TonalPalette.fromInt(argbFromHex(SEEDS.tertiary)),
    neutral: TonalPalette.fromHueAndChroma(NEUTRAL.hue, NEUTRAL.chroma),
    neutralVariant: TonalPalette.fromHueAndChroma(NEUTRAL_VARIANT.hue, NEUTRAL_VARIANT.chroma),
    error: TonalPalette.fromHueAndChroma(ERROR.hue, ERROR.chroma),
    pass: TonalPalette.fromHueAndChroma(hueOf(SEEDS.pass), CHROMA.pass),
    warn: TonalPalette.fromHueAndChroma(hueOf(SEEDS.warn), CHROMA.warn)
  };
}

function wholeTone(role, tone) {
  const rounded = Math.round(tone);
  if (Math.abs(rounded - tone) > 1e-6) {
    throw new Error(`${role} resolves to tone ${tone}, which is not a whole palette tone`);
  }
  return rounded;
}

/** Returns { role: { palette, tone } } for one mode. */
export function resolveRoles(palettes, isDark) {
  const scheme = new DynamicScheme({
    sourceColorArgb: argbFromHex(SEEDS.primary),
    variant: new SchemeTonalSpot(Hct.fromInt(argbFromHex(SEEDS.primary)), isDark, 0).variant,
    contrastLevel: 0,
    isDark,
    primaryPalette: palettes.primary,
    secondaryPalette: palettes.secondary,
    tertiaryPalette: palettes.tertiary,
    neutralPalette: palettes.neutral,
    neutralVariantPalette: palettes.neutralVariant
  });
  // DynamicScheme builds its own error palette, so palettes are named by the
  // scheme property that holds them rather than by identity with `palettes`.
  const paletteNames = new Map([
    [scheme.primaryPalette, 'primary'],
    [scheme.secondaryPalette, 'secondary'],
    [scheme.tertiaryPalette, 'tertiary'],
    [scheme.neutralPalette, 'neutral'],
    [scheme.neutralVariantPalette, 'neutralVariant'],
    [scheme.errorPalette, 'error']
  ]);

  const roles = {};
  for (const role of MATERIAL_ROLES) {
    const color = MaterialDynamicColors[role];
    const palette = paletteNames.get(color.palette(scheme));
    if (!palette) throw new Error(`${role} uses a palette outside the scheme`);
    roles[role] = { palette, tone: wholeTone(role, color.getTone(scheme)) };
  }
  for (const [role, [palette, materialRole]] of Object.entries(APP_ROLES)) {
    roles[role] = { palette, tone: roles[materialRole].tone };
  }
  roles.ornament = {
    palette: ORNAMENT.palette,
    tone: ORNAMENT.tones[isDark ? 'dark' : 'light']
  };
  return roles;
}

/** Returns the hex colour of a { palette, tone } reference. */
export function hexOf(palettes, { palette, tone }) {
  return hexFromArgb(palettes[palette].tone(tone));
}

/** Returns, per palette, the standard tones plus every tone a mode uses. */
export function publishedTones(palettes, modes) {
  const tones = Object.fromEntries(
    Object.keys(palettes).map((name) => [name, new Set(STANDARD_TONES)])
  );
  for (const roles of Object.values(modes)) {
    for (const { palette, tone } of Object.values(roles)) tones[palette].add(tone);
  }
  return Object.fromEntries(
    Object.entries(tones).map(([name, set]) => [name, [...set].sort((a, b) => a - b)])
  );
}
