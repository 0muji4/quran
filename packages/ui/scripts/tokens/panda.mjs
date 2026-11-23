// Web renderer: semantic tokens → a TypeScript module of Panda token objects.
// Pure functions that return file contents; no I/O.

import { GENERATED_NOTICE } from './output.mjs';

const header = GENERATED_NOTICE.map((line) => `// ${line}`).join('\n');
const key = (name) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : `'${name}'`);
const entries = (lines) => lines.map((line) => `  ${line}`).join(',\n');

function colorEntries({ material, app }) {
  return [...material, ...app].map(
    ({ name, light, dark }) => `${key(name)}: { value: { base: '#${light}', _dark: '#${dark}' } }`
  );
}

const dimensionEntries = (dimensions) =>
  dimensions.map(({ name, px }) => `${key(name)}: { value: '${px}px' }`);

/** Returns { file name: contents } for the Web generated directory. */
export function renderPanda(tokens) {
  return {
    'tokens.ts': `${header}

/**
 * Material 3 colour roles and the app-specific roles, as Panda semantic
 * tokens. \`base\` is the light value; \`_dark\` applies under the \`dark\`
 * condition, which the Panda config binds to \`prefers-color-scheme: dark\`.
 */
export const colorRoles = {
${entries(colorEntries(tokens.colors))}
} as const;

/** Spacing on a 4px grid. */
export const spacing = {
${entries(dimensionEntries(tokens.spacing))}
} as const;

/** Corner radii on the Material 3 shape scale. */
export const shape = {
${entries(dimensionEntries(tokens.shape))}
} as const;
`
  };
}
