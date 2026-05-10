'use client';

import {
  fetchAttemptsFromBff,
  fetchBestScoresFromBff,
  fetchLastPracticedFromBff,
  postAttemptToBff,
  putBestScoreToBff,
  putLastPracticedToBff
} from '../actions';
import type { Attempt, BestScoreEntry, BestScores, LastPracticed } from './storage-types';

export type { Attempt, BestScoreEntry, BestScores, LastPracticed };

const KEY_LAST = 'tilawah:last-practiced';
const KEY_BEST = 'tilawah:best-scores';
const KEY_HIST = 'tilawah:recent-attempts';

const HISTORY_LIMIT = 50;

// Throttle background refreshes per storage key. The BFF is the source
// of truth, but a render-time getter that fires a fetch on every call
// would saturate the network. 30 s is enough to pick up cross-device
// updates within a session without flooding.
const REFRESH_INTERVAL_MS = 30_000;
const lastRefreshedAt = new Map<string, number>();

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

const removeKey = (key: string): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const shouldRefresh = (key: string): boolean => {
  const last = lastRefreshedAt.get(key) ?? 0;
  return Date.now() - last >= REFRESH_INTERVAL_MS;
};

const markRefreshed = (key: string): void => {
  lastRefreshedAt.set(key, Date.now());
};

// Fire-and-forget refresh. Errors are swallowed because the cache is
// the user-facing fallback; the next call will re-attempt anyway.
const refreshLastPracticed = async (): Promise<void> => {
  if (!shouldRefresh(KEY_LAST)) return;
  markRefreshed(KEY_LAST);
  try {
    const value = await fetchLastPracticedFromBff();
    if (value) writeJson(KEY_LAST, value);
    else removeKey(KEY_LAST);
  } catch {
    /* ignore; cache stays as the fallback */
  }
};

const refreshBestScores = async (): Promise<void> => {
  if (!shouldRefresh(KEY_BEST)) return;
  markRefreshed(KEY_BEST);
  try {
    const value = await fetchBestScoresFromBff();
    writeJson(KEY_BEST, value);
  } catch {
    /* ignore */
  }
};

const refreshRecentAttempts = async (): Promise<void> => {
  if (!shouldRefresh(KEY_HIST)) return;
  markRefreshed(KEY_HIST);
  try {
    const attempts = await fetchAttemptsFromBff(HISTORY_LIMIT);
    writeJson(KEY_HIST, { attempts });
  } catch {
    /* ignore */
  }
};

// Eager pull of all three keys, used by AppShell on mount and again on
// sign-in transitions. Bypasses the throttle so the first paint after
// authenticating sees fresh data.
export const refreshAllFromBff = async (): Promise<void> => {
  lastRefreshedAt.clear();
  await Promise.allSettled([refreshLastPracticed(), refreshBestScores(), refreshRecentAttempts()]);
};

// Wipe every cache key. Called on sign-in / sign-up / sign-out so the
// previous identity's last-practiced and best-scores never bleed into
// the next session.
export const clearLocalCache = (): void => {
  removeKey(KEY_LAST);
  removeKey(KEY_BEST);
  removeKey(KEY_HIST);
  lastRefreshedAt.clear();
};

// One-shot migration on first sign-up: push every cache entry an
// anonymous user accumulated to the BFF so their progress survives
// the auth transition. Best-effort — a 401 / 5xx is swallowed so
// sign-up still completes for the user.
export const migrateAnonymousCacheToBff = async (): Promise<void> => {
  if (!isBrowser()) return;

  const last = readJson<LastPracticed>(KEY_LAST);
  const scores = readJson<BestScores>(KEY_BEST) ?? {};
  const attempts = readJson<{ attempts: Attempt[] }>(KEY_HIST)?.attempts ?? [];

  const tasks: Promise<unknown>[] = [];
  if (last) tasks.push(putLastPracticedToBff(last));

  for (const [key, entry] of Object.entries(scores)) {
    const [surahId, ayahRaw] = key.split(':');
    const ayahNumber = Number(ayahRaw);
    if (!surahId || !Number.isInteger(ayahNumber) || ayahNumber < 1) continue;
    tasks.push(putBestScoreToBff(surahId, ayahNumber, entry));
  }

  // Replay attempts oldest-first so the BFF's "most recent" ordering
  // matches the chronology the user saw locally.
  const ordered = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const attempt of ordered) tasks.push(postAttemptToBff(attempt));

  await Promise.allSettled(tasks);
};

export const getLastPracticed = (): LastPracticed | null => {
  void refreshLastPracticed();
  return readJson<LastPracticed>(KEY_LAST);
};

export const setLastPracticed = (entry: LastPracticed): void => {
  writeJson(KEY_LAST, entry);
  markRefreshed(KEY_LAST);
  void putLastPracticedToBff(entry).catch(() => {
    /* ignore; the next refresh will reconcile */
  });
};

export const getBestScores = (): BestScores => {
  void refreshBestScores();
  return readJson<BestScores>(KEY_BEST) ?? {};
};

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
  const all = readJson<BestScores>(KEY_BEST) ?? {};
  const key = bestScoreKey(surahId, ayahNumber);
  const existing = all[key];
  if (existing && existing.score >= score) return;

  const entry: BestScoreEntry = { score, achievedAt: new Date().toISOString() };
  all[key] = entry;
  writeJson(KEY_BEST, all);
  markRefreshed(KEY_BEST);
  void putBestScoreToBff(surahId, ayahNumber, entry).catch(() => {
    /* ignore */
  });
};

export const getRecentAttempts = (limit = HISTORY_LIMIT): Attempt[] => {
  void refreshRecentAttempts();
  const log = readJson<{ attempts: Attempt[] }>(KEY_HIST);
  if (!log?.attempts) return [];
  return log.attempts.slice(0, limit);
};

export const recordAttempt = (attempt: Attempt): void => {
  const existing = readJson<{ attempts: Attempt[] }>(KEY_HIST)?.attempts ?? [];
  const next = [attempt, ...existing].slice(0, HISTORY_LIMIT);
  writeJson(KEY_HIST, { attempts: next });
  markRefreshed(KEY_HIST);
  void postAttemptToBff(attempt).catch(() => {
    /* ignore */
  });
};

export const getAttemptsForToday = (surahId: string, ayahNumber: number): Attempt[] => {
  const todayKey = new Date().toDateString();
  return getRecentAttempts(HISTORY_LIMIT).filter((a) => {
    if (a.surahId !== surahId || a.ayahNumber !== ayahNumber) return false;
    const at = new Date(a.createdAt);
    if (Number.isNaN(at.getTime())) return false;
    return at.toDateString() === todayKey;
  });
};
