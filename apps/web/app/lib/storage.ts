'use client';

const KEY_LAST = 'tilawah:last-practiced';
const KEY_BEST = 'tilawah:best-scores';
const KEY_HIST = 'tilawah:recent-attempts';

export type LastPracticed = {
  surahId: string;
  ayahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahCount: number;
  practicedAt: string;
};

export type BestScoreEntry = { score: number; achievedAt: string };
export type BestScores = Record<string, BestScoreEntry>;

export type Attempt = {
  id: string;
  surahId: string;
  surahNameEn: string;
  ayahNumber: number;
  score: number | null;
  jobId: string;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED';
};

const HISTORY_LIMIT = 50;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJson = <T>(key: string): T | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded / privacy mode — fail silently */
  }
};

export const getLastPracticed = (): LastPracticed | null => readJson<LastPracticed>(KEY_LAST);

export const setLastPracticed = (entry: LastPracticed): void => writeJson(KEY_LAST, entry);

export const getBestScores = (): BestScores => readJson<BestScores>(KEY_BEST) ?? {};

const bestScoreKey = (surahId: string, ayahNumber: number): string => `${surahId}:${ayahNumber}`;

export const getBestScore = (surahId: string, ayahNumber: number): BestScoreEntry | null => {
  const all = getBestScores();
  return all[bestScoreKey(surahId, ayahNumber)] ?? null;
};

export const getBestScoreForSurah = (surahId: string): number | null => {
  const all = getBestScores();
  const prefix = `${surahId}:`;
  let max: number | null = null;
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(prefix)) {
      max = max === null ? v.score : Math.max(max, v.score);
    }
  }
  return max;
};

export const recordBestScore = (surahId: string, ayahNumber: number, score: number): void => {
  const all = getBestScores();
  const key = bestScoreKey(surahId, ayahNumber);
  const existing = all[key];
  if (!existing || score > existing.score) {
    all[key] = { score, achievedAt: new Date().toISOString() };
    writeJson(KEY_BEST, all);
  }
};

export const getRecentAttempts = (limit = HISTORY_LIMIT): Attempt[] => {
  const log = readJson<{ attempts: Attempt[] }>(KEY_HIST);
  if (!log?.attempts) return [];
  return log.attempts.slice(0, limit);
};

export const recordAttempt = (attempt: Attempt): void => {
  const existing = getRecentAttempts(HISTORY_LIMIT);
  const next = [attempt, ...existing].slice(0, HISTORY_LIMIT);
  writeJson(KEY_HIST, { attempts: next });
};
