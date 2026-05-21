// Shared types for the per-user practice state. Used by both the
// Server Actions in actions.ts (which marshal them to / from the BFF)
// and the localStorage cache layer in storage.ts.
//
// Kept in a separate module so actions.ts can be 'use server' and
// storage.ts can be 'use client' without import cycles.

export interface LastPracticed {
  surahId: string;
  ayahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahCount: number;
  practicedAt: string;
}

export interface BestScoreEntry {
  score: number;
  achievedAt: string;
}

export type BestScores = Record<string, BestScoreEntry>;

export interface Attempt {
  id: string;
  surahId: string;
  surahNameEn: string;
  ayahNumber: number;
  score: number | null;
  jobId: string;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED';
  durationMs?: number | null;
}
