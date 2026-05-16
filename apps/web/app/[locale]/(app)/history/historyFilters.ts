import type { Attempt } from '../../../lib/storage';

export type HistoryFilter = { kind: 'all' } | { kind: 'surah'; id: string; nameEn: string };

export const ALL_FILTER: HistoryFilter = { kind: 'all' };

// Cap the chip row so it doesn't overflow on narrow phones; same value
// as iOS `HistoryViewModel.filterOptions` (which breaks at result.count
// >= 5 — All + 4 surahs).
const MAX_SURAH_CHIPS = 4;

// Stable identity for a filter, suitable as a React `key` and as the
// equality test when comparing the currently selected filter against
// the option list.
export const filterKey = (filter: HistoryFilter): string =>
  filter.kind === 'all' ? 'all' : `surah:${filter.id}`;

// Mirrors iOS `HistoryViewModel.filterOptions`: "All" plus up to four
// distinct surahs, ordered by recency. Assumes `attempts` arrives
// newest-first (which is how `getRecentAttempts` returns them).
export const historyFilterOptions = (attempts: Attempt[]): HistoryFilter[] => {
  const seen = new Set<string>();
  const result: HistoryFilter[] = [ALL_FILTER];
  for (const attempt of attempts) {
    if (!seen.has(attempt.surahId)) {
      seen.add(attempt.surahId);
      result.push({ kind: 'surah', id: attempt.surahId, nameEn: attempt.surahNameEn });
      if (result.length >= MAX_SURAH_CHIPS + 1) break;
    }
  }
  return result;
};

export const filterAttempts = (attempts: Attempt[], filter: HistoryFilter): Attempt[] => {
  if (filter.kind === 'all') return attempts;
  return attempts.filter((a) => a.surahId === filter.id);
};
