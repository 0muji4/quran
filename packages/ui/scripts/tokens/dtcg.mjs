// Serialisation to the token layers, in the Design Tokens Community Group
// (DTCG) format. Pure functions that return JSON-ready objects; no I/O.
//
//   Layer 2, primitive: raw values (tonal palettes, a px scale).
//   Layer 3, semantic:  named usages, written only as aliases into layer 2.

import { hexFromArgb } from '@material/material-color-utilities';

/** Primitive colours: `color.palette.<palette>.<tone>`. */
export function primitiveColorTokens(palettes, tonesByPalette) {
  const palette = { $type: 'color' };
  for (const [name, tones] of Object.entries(tonesByPalette)) {
    palette[name] = Object.fromEntries(
      tones.map((tone) => [String(tone), { $value: hexFromArgb(palettes[name].tone(tone)) }])
    );
  }
  return { color: { palette } };
}

/** Semantic colours for one mode: `color.role.<role>`. */
export function semanticColorTokens(roles) {
  const role = { $type: 'color' };
  for (const [name, { palette, tone }] of Object.entries(roles)) {
    role[name] = { $value: `{color.palette.${palette}.${tone}}` };
  }
  return { color: { role } };
}

/** Primitive dimensions: `dimension.<px>`, one entry per distinct value. */
export function primitiveDimensionTokens(...scales) {
  const values = [...new Set(scales.flatMap((scale) => Object.values(scale)))].sort(
    (a, b) => a - b
  );
  const dimension = { $type: 'dimension' };
  for (const px of values) dimension[String(px)] = { $value: `${px}px` };
  return { dimension };
}

/** Semantic dimensions: `spacing.<step>` and `shape.<size>`. */
export function semanticDimensionTokens(spacing, shape) {
  const aliases = (scale) =>
    Object.fromEntries(
      Object.entries(scale).map(([name, px]) => [name, { $value: `{dimension.${px}}` }])
    );
  return {
    spacing: { $type: 'dimension', ...aliases(spacing) },
    shape: { $type: 'dimension', ...aliases(shape) }
  };
}
