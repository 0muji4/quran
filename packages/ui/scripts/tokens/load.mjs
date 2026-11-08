// Platform input: reads the DTCG token files with Style Dictionary, resolves
// aliases once per colour mode, and returns the semantic layer only. Primitive
// tokens never reach the platform renderers.

import { join } from 'node:path';
import StyleDictionary from 'style-dictionary';

import { MATERIAL_ROLES } from './roles.mjs';

async function resolvedTokens(tokensDir, mode) {
  const sd = new StyleDictionary({
    source: [
      join(tokensDir, 'primitive', 'color.tokens.json'),
      join(tokensDir, 'primitive', 'dimension.tokens.json'),
      join(tokensDir, 'semantic', `color.${mode}.tokens.json`),
      join(tokensDir, 'semantic', 'dimension.tokens.json')
    ],
    usesDtcg: true,
    log: { verbosity: 'silent' },
    platforms: { native: {} }
  });
  const { allTokens } = await sd.getPlatformTokens('native');
  return allTokens;
}

function colorRoles(tokens) {
  const roles = new Map();
  for (const token of tokens) {
    if (token.path[0] === 'color' && token.path[1] === 'role') {
      roles.set(token.path[2], token.$value.replace('#', '').toUpperCase());
    }
  }
  return roles;
}

function dimensions(tokens, group) {
  return tokens
    .filter((token) => token.path[0] === group)
    .map((token) => ({ name: token.path[1], px: Number.parseFloat(token.$value) }));
}

/**
 * Returns the semantic tokens as
 * { colors: { material, app }, spacing, shape }, where each colour is
 * { name, light, dark } in uppercase RRGGBB and each dimension is { name, px }.
 */
export async function loadSemanticTokens(tokensDir) {
  const light = await resolvedTokens(tokensDir, 'light');
  const dark = await resolvedTokens(tokensDir, 'dark');
  const lightRoles = colorRoles(light);
  const darkRoles = colorRoles(dark);

  for (const role of lightRoles.keys()) {
    if (!darkRoles.has(role)) throw new Error(`${role} has a light value but no dark value`);
  }
  for (const role of darkRoles.keys()) {
    if (!lightRoles.has(role)) throw new Error(`${role} has a dark value but no light value`);
  }
  for (const role of MATERIAL_ROLES) {
    if (!lightRoles.has(role)) throw new Error(`Material 3 role ${role} is missing`);
  }

  const color = (name) => ({ name, light: lightRoles.get(name), dark: darkRoles.get(name) });
  return {
    colors: {
      material: MATERIAL_ROLES.map(color),
      app: [...lightRoles.keys()].filter((name) => !MATERIAL_ROLES.includes(name)).map(color)
    },
    spacing: dimensions(light, 'spacing'),
    shape: dimensions(light, 'shape')
  };
}
