import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.d.ts'
      ],
      // TODO(#567): Restore the 80% thresholds by adding tests. Until then, do
      // not lower these values; ratchet them up as coverage improves.
      thresholds: {
        lines: 12,
        functions: 30,
        branches: 61,
        statements: 12
      }
    }
  }
});
