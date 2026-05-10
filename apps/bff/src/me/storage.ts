import { getDatabasePool } from '../infra/storage';

// Row shapes returned to the Web client. Mirror the TS types in
// apps/web/app/lib/storage.ts so the Server Action wrapper in PR
// 3.1-D can pass values through unchanged.

export type LastPracticedRow = {
  surahId: string;
  ayahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahCount: number;
  practicedAt: string;
};

export type BestScoreEntry = {
  score: number;
  achievedAt: string;
};

export type BestScoresMap = Record<string, BestScoreEntry>;

export type PracticeAttemptRow = {
  id: string;
  surahId: string;
  surahNameEn: string;
  ayahNumber: number;
  score: number | null;
  jobId: string;
  status: 'COMPLETED' | 'FAILED';
  durationMs: number | null;
  createdAt: string;
};

export const getLastPracticed = async (userId: string): Promise<LastPracticedRow | null> => {
  const pool = getDatabasePool();
  if (!pool) return null;
  const result = await pool.query(
    `
    SELECT surah_id, ayah_number, surah_name_en, surah_name_ar, ayah_count, practiced_at
    FROM last_practiced
    WHERE user_id = $1
    `,
    [userId]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    surahId: row.surah_id,
    ayahNumber: row.ayah_number,
    surahNameEn: row.surah_name_en,
    surahNameAr: row.surah_name_ar,
    ayahCount: row.ayah_count,
    practicedAt: new Date(row.practiced_at).toISOString()
  };
};

export const getBestScores = async (userId: string): Promise<BestScoresMap> => {
  const pool = getDatabasePool();
  if (!pool) return {};
  const result = await pool.query(
    `
    SELECT surah_id, ayah_number, score, achieved_at
    FROM best_scores
    WHERE user_id = $1
    `,
    [userId]
  );
  const out: BestScoresMap = {};
  for (const row of result.rows) {
    const key = `${row.surah_id}:${row.ayah_number}`;
    out[key] = {
      score: row.score,
      achievedAt: new Date(row.achieved_at).toISOString()
    };
  }
  return out;
};

export const getRecentAttempts = async (
  userId: string,
  limit: number
): Promise<PracticeAttemptRow[]> => {
  const pool = getDatabasePool();
  if (!pool) return [];
  const result = await pool.query(
    `
    SELECT id, surah_id, surah_name_en, ayah_number, score, job_id, status, duration_ms, created_at
    FROM practice_attempts
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows.map((row) => ({
    id: row.id,
    surahId: row.surah_id,
    surahNameEn: row.surah_name_en,
    ayahNumber: row.ayah_number,
    score: row.score,
    jobId: row.job_id,
    status: row.status,
    durationMs: row.duration_ms,
    createdAt: new Date(row.created_at).toISOString()
  }));
};
