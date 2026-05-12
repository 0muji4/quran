import { describe, it, expect } from 'vitest';
import { difficultyOf, pickSuggestion } from '../lib/classify';
import type { SurahSummary } from '../lib/types';

const surah = (over: Partial<SurahSummary> & { id: string }): SurahSummary => ({
  nameEn: `Surah-${over.id}`,
  nameAr: `سورة-${over.id}`,
  ayahCount: 5,
  revelationPlace: 'Mecca',
  ...over
});

describe('difficultyOf', () => {
  it('returns the BFF-provided difficulty when present, capitalised', () => {
    const s = surah({ id: '1', ayahCount: 286 });
    expect(difficultyOf(s, { '1': 'easy' })).toBe('Easy');
    expect(difficultyOf(s, { '1': 'medium' })).toBe('Medium');
    expect(difficultyOf(s, { '1': 'hard' })).toBe('Hard');
  });

  it('falls back to ayah-count heuristic when no BFF entry exists for the surah', () => {
    expect(difficultyOf(surah({ id: '1', ayahCount: 7 }))).toBe('Easy');
    expect(difficultyOf(surah({ id: '1', ayahCount: 20 }))).toBe('Medium');
    expect(difficultyOf(surah({ id: '1', ayahCount: 60 }))).toBe('Hard');
  });

  it('falls back to ayah-count heuristic when the map is empty', () => {
    expect(difficultyOf(surah({ id: '1', ayahCount: 7 }), {})).toBe('Easy');
  });

  it('falls back to ayah-count heuristic when the map omits this surah', () => {
    expect(difficultyOf(surah({ id: '2', ayahCount: 7 }), { '1': 'hard' })).toBe('Easy');
  });
});

describe('pickSuggestion', () => {
  const baseSurahs: SurahSummary[] = [
    surah({ id: '1', ayahCount: 7 }),
    surah({ id: '103', ayahCount: 3 }),
    surah({ id: '108', ayahCount: 3 }),
    surah({ id: '112', ayahCount: 4 })
  ];

  it('returns null on an empty list', () => {
    expect(pickSuggestion([], null)).toBeNull();
  });

  it('prefers the BFF-suggested surah when present in the list', () => {
    const result = pickSuggestion(baseSurahs, null, '108');
    expect(result?.id).toBe('108');
  });

  it('falls back to the local heuristic when BFF suggestion is missing', () => {
    // No BFF input → previous behaviour: short Meccan, skipping continuing surah.
    const result = pickSuggestion(baseSurahs, null);
    expect(result?.id).toBe('112'); // Al-Ikhlas preferred amongst short Meccans
  });

  it('falls back to the local heuristic when BFF suggests a surah not in the list', () => {
    const result = pickSuggestion(baseSurahs, null, '999');
    expect(result?.id).toBe('112');
  });

  it("skips the user's currently continuing surah in the local fallback", () => {
    const result = pickSuggestion(baseSurahs, {
      surahId: '112',
      ayahNumber: 1,
      surahNameEn: 'Al-Ikhlas',
      surahNameAr: 'الإخلاص',
      ayahCount: 4,
      practicedAt: '2026-05-08T10:00:00.000Z'
    });
    // 112 is excluded → first short Meccan in input order with id != 112 wins.
    expect(result?.id).toBe('1');
  });
});
