import type { ScoringResult, SignedUploadUrl } from '@quran-project/shared-ts';

import type { SurahSummary } from './types';

export const summarizeSurah = (surah: SurahSummary): string =>
  `${surah.nameEn} • ${surah.revelationPlace} • ${surah.ayahCount} ayahs`;

export const describeUploadTarget = (upload: SignedUploadUrl): string =>
  `PUT ${upload.url} (expires ${upload.expiresAt})`;

export const extractSegmentScores = (result: ScoringResult): Array<{ label: string; score: number }> =>
  result.segments.map((segment) => ({ label: segment.label, score: segment.score }));
