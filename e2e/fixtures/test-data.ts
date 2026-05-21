/**
 * Test data and utilities for E2E tests
 */

export const testSurahs = {
  alFatihah: {
    id: '1',
    nameEn: 'Al-Fatihah',
    nameAr: 'الفاتحة',
    ayahCount: 7
  },
  alBaqarah: {
    id: '2',
    nameEn: 'Al-Baqarah',
    nameAr: 'البقرة',
    ayahCount: 286
  },
  anNas: {
    id: '114',
    nameEn: 'An-Nas',
    nameAr: 'الناس',
    ayahCount: 6
  }
} as const;

export const testAyahs = {
  fatihah1: {
    surahId: '1',
    ayahNumber: 1
  },
  fatihah2: {
    surahId: '1',
    ayahNumber: 2
  },
  nas1: {
    surahId: '114',
    ayahNumber: 1
  }
} as const;

/**
 * Generate a unique session ID for test isolation
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `e2e-test-${timestamp}-${random}`;
}

/**
 * Wait utility with timeout
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
