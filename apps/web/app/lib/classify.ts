import type { SurahSummary } from './types';
import type { LastPracticed } from './storage';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// Placeholder heuristic: real difficulty data is not in the BFF yet.
export const difficultyOf = (surah: SurahSummary): Difficulty => {
  if (surah.ayahCount <= 10) return 'Easy';
  if (surah.ayahCount <= 30) return 'Medium';
  return 'Hard';
};

const SUGGESTED_FALLBACK_ID = '112'; // Al-Ikhlas

const isMeccan = (s: SurahSummary): boolean => /mecc/i.test(s.revelationPlace);

// Deterministic suggestion: pick a short Meccan surah the user is not currently
// continuing. Falls back to Al-Ikhlas. No daily randomization to keep paint stable.
export const pickSuggestion = (
  surahs: SurahSummary[],
  lastPracticed: LastPracticed | null
): SurahSummary | null => {
  if (surahs.length === 0) return null;
  const continuingId = lastPracticed?.surahId;
  const candidates = surahs.filter(
    (s) => s.id !== continuingId && isMeccan(s) && s.ayahCount <= 10
  );
  if (candidates.length > 0) {
    const fatihahFirst = candidates.find((s) => s.id === SUGGESTED_FALLBACK_ID);
    return fatihahFirst ?? candidates[0];
  }
  return surahs.find((s) => s.id === SUGGESTED_FALLBACK_ID) ?? surahs[0];
};

export const formatPracticedAt = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString();
};
