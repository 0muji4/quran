// Stage 1 entry point: design inputs (layer 1) → DTCG token files (layers 2
// and 3) in packages/ui/tokens/.
//
//   primitive/color.tokens.json        tonal palettes
//   primitive/dimension.tokens.json    px scale
//   semantic/color.light.tokens.json   colour roles, light mode
//   semantic/color.dark.tokens.json    colour roles, dark mode
//   semantic/dimension.tokens.json     spacing and shape
//
// Fails when a role misses a whole palette tone or a text/background pair is
// below WCAG AA.
//
// Usage: node packages/ui/scripts/tokens/generate-source.mjs

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIN_CONTRAST, findContrastFailures } from './contrast.mjs';
import {
  primitiveColorTokens,
  primitiveDimensionTokens,
  semanticColorTokens,
  semanticDimensionTokens
} from './dtcg.mjs';
import { SHAPE, SPACING } from './inputs.mjs';
import { json, writeOwnedDir } from './output.mjs';
import { buildPalettes, hexOf, publishedTones, resolveRoles } from './palette.mjs';

const tokensDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tokens');

const palettes = buildPalettes();
const modes = { light: resolveRoles(palettes, false), dark: resolveRoles(palettes, true) };

const failures = Object.entries(modes).flatMap(([mode, roles]) =>
  findContrastFailures(
    mode,
    Object.fromEntries(Object.entries(roles).map(([role, ref]) => [role, hexOf(palettes, ref)]))
  )
);
if (failures.length > 0) {
  throw new Error(`Contrast below ${MIN_CONTRAST}:1\n${failures.join('\n')}`);
}

writeOwnedDir(tokensDir, {
  'primitive/color.tokens.json': json(
    primitiveColorTokens(palettes, publishedTones(palettes, modes))
  ),
  'primitive/dimension.tokens.json': json(primitiveDimensionTokens(SPACING, SHAPE)),
  'semantic/color.light.tokens.json': json(semanticColorTokens(modes.light)),
  'semantic/color.dark.tokens.json': json(semanticColorTokens(modes.dark)),
  'semantic/dimension.tokens.json': json(semanticDimensionTokens(SPACING, SHAPE))
});
