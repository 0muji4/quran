import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/dist/**'],
    environment: 'node',
    // Yoga checks errors with instanceof. Bundling these keeps every import on
    // one copy of graphql, as the CommonJS build already does.
    server: {
      deps: { inline: ['graphql-yoga', /@graphql-tools\//, /@envelop\//, /@graphql-yoga\//] }
    },
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    // bcryptjs is pure JS, and coverage slows it past the 5s default on busy
    // runners.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/gen/**', // Exclude protoc-generated code
        'src/server/**' // Exclude server entry points
      ],
      // TODO(#567): Restore the 80% thresholds by adding tests. Until then, do
      // not lower these values; ratchet them up as coverage improves.
      thresholds: {
        lines: 66,
        functions: 63,
        branches: 57,
        statements: 66
      }
    }
  },
  resolve: {
    alias: {
      '@quran-project/shared-ts': new URL('../../packages/shared-ts/src/index.ts', import.meta.url)
        .pathname
    }
  }
});
