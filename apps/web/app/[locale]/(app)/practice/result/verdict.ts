// Score → verdict-band mapping. Returns a discriminated kind so callers
// resolve display copy via `useTranslations('result.verdict.<kind>.*')`
// rather than baking English strings into pure logic.
export type VerdictKind = 'awaiting' | 'mastered' | 'great' | 'midway' | 'beginner';

export const verdictForScore = (score: number | null): VerdictKind => {
  if (score === null || Number.isNaN(score)) return 'awaiting';
  if (score >= 90) return 'mastered';
  if (score >= 70) return 'great';
  if (score >= 40) return 'midway';
  return 'beginner';
};
