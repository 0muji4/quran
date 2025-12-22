import type { ScoringResult, SignedUploadUrl, Surah } from '@quran-project/shared-ts';

export type SurahSummary = Pick<Surah, 'id' | 'nameAr' | 'nameEn' | 'ayahCount' | 'revelationPlace'>;

export const summarizeSurah = (surah: SurahSummary): string =>
  `${surah.nameEn} • ${surah.revelationPlace} • ${surah.ayahCount} ayahs`;

export const describeUploadTarget = (upload: SignedUploadUrl): string =>
  `POST ${upload.url} (expires ${upload.expiresAt})`;

export const extractSegmentScores = (result: ScoringResult): Array<{ label: string; score: number }> =>
  result.segments.map((segment) => ({ label: segment.label, score: segment.score }));
