import { defineConfig } from '@pandacss/dev';

// PR 1 (bootstrap). Theme/recipes are intentionally empty here; tokens land in
// PR 2 and recipes in PR 4+. preflight is off because globals.css owns the
// reset. strictTokens is off until PR 2 introduces the tokens it would gate.
export default defineConfig({
  preflight: false,
  jsxFramework: 'react',
  jsxStyleProps: 'minimal',
  strictTokens: false,
  strictPropertyValues: false,
  hash: false,
  include: ['../../apps/web/app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  exclude: ['**/*.module.css'],
  outdir: 'styled-system',
  emitPackage: false,
  theme: {
    extend: {}
  }
});
