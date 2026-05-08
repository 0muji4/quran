import { Page } from '@playwright/test';

/**
 * Helpers for seeding the Tilawah localStorage namespace before navigation.
 *
 * Each helper installs an `addInitScript`, so call it BEFORE `page.goto`.
 */

export type LastPracticedSeed = {
  surahId: string;
  ayahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahCount: number;
  practicedAt: string;
};

export type AttemptSeed = {
  id: string;
  surahId: string;
  surahNameEn: string;
  ayahNumber: number;
  score: number | null;
  jobId: string;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED';
};

export async function seedLastPracticed(page: Page, seed: LastPracticedSeed): Promise<void> {
  await page.addInitScript((data) => {
    window.localStorage.setItem('tilawah:last-practiced', JSON.stringify(data));
  }, seed);
}

export async function seedAttempts(page: Page, attempts: AttemptSeed[]): Promise<void> {
  await page.addInitScript((data) => {
    window.localStorage.setItem('tilawah:recent-attempts', JSON.stringify({ attempts: data }));
  }, attempts);
}

export async function clearTilawahStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('tilawah:')) {
        window.localStorage.removeItem(key);
      }
    }
  });
}
