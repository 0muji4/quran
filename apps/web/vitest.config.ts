import { defineConfig } from 'vitest/config';

export default defineConfig({
  // jsdom does not render styles; disable the project's PostCSS pipeline so
  // the Panda plugin (which expects a co-located panda.config.*) is not run
  // on CSS Module imports during tests.
  css: {
    postcss: {
      plugins: []
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
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
