import baseConfig from '@quran-project/eslint-config';

// Root ESLint config. Consumed by the `lint:e2e` script (`eslint e2e`) to
// give the Playwright suite the same Google-aligned rules as the workspace
// packages. Each workspace package keeps its own `eslint.config.js`, so this
// file only ever applies to paths passed explicitly at the repo root.
export default [
  ...baseConfig,
  {
    ignores: ['**/*.config.js', '**/*.config.cjs', '**/*.config.mjs', '**/*.config.ts']
  },
  {
    // The Playwright suite is not React. Its fixture callbacks take a `use`
    // argument, which the React Hooks plugin misreads as a call to React 19's
    // `use` hook. Disable the rule for this non-React codebase.
    rules: {
      'react-hooks/rules-of-hooks': 'off'
    }
  },
  {
    // Playwright requires `globalSetup`/`globalTeardown` modules to default-
    // export the setup/teardown function.
    files: ['e2e/global-setup.ts', 'e2e/global-teardown.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  }
];
