import type { SurahSummary } from './types';

export type RevelationFilter = 'all' | 'mecca' | 'medina' | 'short';

const isMeccan = (s: SurahSummary): boolean => /mecc/i.test(s.revelationPlace);
const isMedinan = (s: SurahSummary): boolean => /medin/i.test(s.revelationPlace);
const isShort = (s: SurahSummary): boolean => s.ayahCount <= 10;

export const matchesRevelationFilter = (s: SurahSummary, filter: RevelationFilter): boolean => {
  switch (filter) {
    case 'mecca':
      return isMeccan(s);
    case 'medina':
      return isMedinan(s);
    case 'short':
      return isShort(s);
    case 'all':
    default:
      return true;
  }
};

export const matchesQuery = (s: SurahSummary, query: string): boolean => {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    s.nameEn.toLowerCase().includes(lower) || s.nameAr.includes(trimmed) || String(s.id) === trimmed
  );
};

export const filterSurahs = (
  surahs: SurahSummary[],
  query: string,
  filter: RevelationFilter
): SurahSummary[] =>
  surahs.filter((s) => matchesQuery(s, query) && matchesRevelationFilter(s, filter));

export const countByRevelation = (surahs: SurahSummary[]) => ({
  all: surahs.length,
  mecca: surahs.filter(isMeccan).length,
  medina: surahs.filter(isMedinan).length,
  short: surahs.filter(isShort).length
});
