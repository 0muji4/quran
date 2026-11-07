import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // jsdom does not render styles; disable the project's PostCSS pipeline so
  // the Panda plugin (which expects a co-located panda.config.*) is not run
  // on CSS Module imports during tests.
  css: {
    postcss: {
      plugins: []
    }
  },
  // tsconfig keeps jsx: preserve for Next.js, which Vite 8 would otherwise follow.
  oxc: {
    jsx: {
      runtime: 'automatic'
    }
  },
  test: {
    exclude: [...configDefaults.exclude, '**/dist/**'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // Node 25+ defines a global localStorage that stays undefined without
    // --localstorage-file, and it shadows the one jsdom provides.
    execArgv: ['--no-experimental-webstorage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}', 'i18n/**/*.ts', 'instrumentation.ts', 'proxy.ts'],
      exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.d.ts'],
      // TODO(#567): Restore the 80% thresholds by adding tests. Until then, do
      // not lower these values; ratchet them up as coverage improves.
      thresholds: {
        lines: 46,
        functions: 43,
        branches: 42,
        statements: 46
      }
    }
  },
  resolve: {
    alias: {
      'server-only': new URL('./test/mocks/server-only.ts', import.meta.url).pathname,
      'next/headers': new URL('./test/mocks/next-headers.ts', import.meta.url).pathname,
      '@quran-project/shared-ts': new URL('../../packages/shared-ts/src/index.ts', import.meta.url)
        .pathname
    }
  }
});
