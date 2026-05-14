export type VerdictBand = {
  badge: string;
  headline: string;
  subhead: string;
};

// Pure helper. Maps a 0–100 score to copy bands. Used by both server-rendered
// hero and any client island that wants to mirror the verdict label.
export const verdictForScore = (score: number | null): VerdictBand => {
  if (score === null || Number.isNaN(score)) {
    return {
      badge: 'AWAITING SCORE',
      headline: 'No score yet',
      subhead: 'Try recording the ayah to receive your pronunciation feedback.'
    };
  }
  if (score >= 90) {
    return {
      badge: 'MASTERED',
      headline: 'Excellent recitation',
      subhead: 'Your pronunciation closely matches the teacher reference. Move on whenever ready.'
    };
  }
  if (score >= 70) {
    return {
      badge: 'GREAT WORK',
      headline: 'Great progress',
      subhead: 'A few subtle differences remain. Listen back and refine your delivery.'
    };
  }
  if (score >= 40) {
    return {
      badge: 'KEEP PRACTISING',
      headline: "Some work to do — that's okay",
      subhead:
        'Several words came through differently than expected. Try listening to the teacher slowly and reciting along before recording again.'
    };
  }
  return {
    badge: 'KEEP PRACTISING',
    headline: 'Not quite there yet',
    subhead:
      'Slow down with the teacher reference and focus on the sounds before retrying. Small, repeated passes work best.'
  };
};
