import { describe, it, expect } from 'vitest';
import { ALL_FILTER, filterAttempts, filterKey, historyFilterOptions } from '../historyFilters';
import type { Attempt } from '../../../lib/storage';

const attempt = (
  overrides: Partial<Attempt> & { id: string; surahId: string; surahNameEn: string }
): Attempt => ({
  id: overrides.id,
  surahId: overrides.surahId,
  surahNameEn: overrides.surahNameEn,
  ayahNumber: overrides.ayahNumber ?? 1,
  score: 80,
  jobId: `job-${overrides.id}`,
  createdAt: overrides.createdAt ?? new Date('2026-05-16T12:00:00Z').toISOString(),
  status: overrides.status ?? 'COMPLETED'
});

describe('historyFilterOptions', () => {
  it('returns only the "All" filter when there are no attempts', () => {
    expect(historyFilterOptions([])).toEqual([ALL_FILTER]);
  });

  it('appends one chip per distinct surah, preserving newest-first order', () => {
    const result = historyFilterOptions([
      attempt({ id: 'a', surahId: '1', surahNameEn: 'Al-Fatihah' }),
      attempt({ id: 'b', surahId: '112', surahNameEn: 'Al-Ikhlas' }),
      attempt({ id: 'c', surahId: '1', surahNameEn: 'Al-Fatihah' }) // duplicate
    ]);
    expect(result).toEqual([
      ALL_FILTER,
      { kind: 'surah', id: '1', nameEn: 'Al-Fatihah' },
      { kind: 'surah', id: '112', nameEn: 'Al-Ikhlas' }
    ]);
  });

  it('caps the chip row at All + 4 most-recent distinct surahs', () => {
    const six = [
      attempt({ id: 'a', surahId: '1', surahNameEn: 'Al-Fatihah' }),
      attempt({ id: 'b', surahId: '2', surahNameEn: 'Al-Baqarah' }),
      attempt({ id: 'c', surahId: '3', surahNameEn: 'Al-Imran' }),
      attempt({ id: 'd', surahId: '4', surahNameEn: 'An-Nisa' }),
      attempt({ id: 'e', surahId: '5', surahNameEn: 'Al-Maidah' }), // should be dropped
      attempt({ id: 'f', surahId: '6', surahNameEn: 'Al-Anam' }) // should be dropped
    ];
    const result = historyFilterOptions(six);
    expect(result).toHaveLength(5); // All + 4
    expect(result.map((f) => (f.kind === 'surah' ? f.nameEn : 'all'))).toEqual([
      'all',
      'Al-Fatihah',
      'Al-Baqarah',
      'Al-Imran',
      'An-Nisa'
    ]);
  });
});

describe('filterAttempts', () => {
  const attempts = [
    attempt({ id: 'a', surahId: '1', surahNameEn: 'Al-Fatihah' }),
    attempt({ id: 'b', surahId: '112', surahNameEn: 'Al-Ikhlas' }),
    attempt({ id: 'c', surahId: '1', surahNameEn: 'Al-Fatihah' })
  ];

  it('returns the full list for the All filter', () => {
    expect(filterAttempts(attempts, ALL_FILTER)).toHaveLength(3);
  });

  it('keeps only attempts whose surahId matches the selected filter', () => {
    const filtered = filterAttempts(attempts, {
      kind: 'surah',
      id: '1',
      nameEn: 'Al-Fatihah'
    });
    expect(filtered.map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('returns an empty list when no attempts match the selected surah', () => {
    const filtered = filterAttempts(attempts, {
      kind: 'surah',
      id: '999',
      nameEn: 'Unknown'
    });
    expect(filtered).toEqual([]);
  });
});

describe('filterKey', () => {
  it('uses a stable string for All', () => {
    expect(filterKey(ALL_FILTER)).toBe('all');
  });

  it('namespaces surah filters by id so two filters for the same surah collide', () => {
    expect(filterKey({ kind: 'surah', id: '1', nameEn: 'Al-Fatihah' })).toBe(
      filterKey({ kind: 'surah', id: '1', nameEn: 'Al-Fatihah Recited' })
    );
  });
});
