// Root Prettier config. Applies to repo-root files not covered by a
// package-local config — notably the `e2e/` Playwright suite. Kept in sync
// with packages/eslint-config/prettier.config.cjs so formatting is uniform
// across the workspace.
module.exports = {
  singleQuote: true,
  semi: true,
  trailingComma: 'none',
  printWidth: 100
};
