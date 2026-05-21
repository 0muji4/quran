import type { SurahSummary } from './types';
import type { LastPracticed } from './storage';

// User-facing label. The BFF speaks lowercase `'easy' | 'medium' | 'hard'`;
// classify.ts is the seam where we convert to the display form so the UI
// can stay untouched.
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// BFF wire types — mirror apps/bff/src/me/suggestions.ts. Kept here
// rather than imported from a shared package so the Web layer stays
// decoupled from the BFF build graph; the shape is small enough that
// duplicating it is cheaper than threading another workspace dep.
export type BffDifficulty = 'easy' | 'medium' | 'hard';
export type BffSuggestionReason = 'short_unpracticed' | 'short_low_score' | 'fallback';
export interface BffSuggestionResponse {
  suggested: { surahId: string; reason: BffSuggestionReason };
  difficulties: Record<string, BffDifficulty>;
}

const SUGGESTED_FALLBACK_ID = '112'; // Al-Ikhlas

const isMeccan = (s: SurahSummary): boolean => /mecc/i.test(s.revelationPlace);

// Placeholder bucketing on ayah_count for surahs the BFF has no data on
// (unauthenticated users, or surahs the user has not scored yet).
const heuristicDifficulty = (surah: SurahSummary): Difficulty => {
  if (surah.ayahCount <= 10) return 'Easy';
  if (surah.ayahCount <= 30) return 'Medium';
  return 'Hard';
};

const capitalize = (label: BffDifficulty): Difficulty =>
  (label.charAt(0).toUpperCase() + label.slice(1)) as Difficulty;

// Per-surah difficulty resolver. Prefer the BFF's per-user signal when
// the user has scored this surah; otherwise fall back to the ayah-count
// placeholder so the UI is never blank.
export const difficultyOf = (
  surah: SurahSummary,
  difficulties?: Record<string, BffDifficulty>
): Difficulty => {
  const bff = difficulties?.[surah.id];
  if (bff) return capitalize(bff);
  return heuristicDifficulty(surah);
};

// Suggestion resolver.
//
// 1. Prefer the BFF's suggestion when present and resolvable to a surah
//    in `surahs` — the server already knows the user's recent history.
// 2. Otherwise fall back to the deterministic Meccan-short heuristic
//    (filtered by what the user is currently continuing) so guests and
//    BFF-failure modes still see something useful.
// 3. As a last resort return Al-Ikhlas or the first surah, matching
//    the pre-3.3 contract that this function never returns null when
//    the list is non-empty.
export const pickSuggestion = (
  surahs: SurahSummary[],
  lastPracticed: LastPracticed | null,
  suggestedSurahId?: string
): SurahSummary | null => {
  if (surahs.length === 0) return null;

  if (suggestedSurahId) {
    const bffPick = surahs.find((s) => s.id === suggestedSurahId);
    if (bffPick) return bffPick;
  }

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
