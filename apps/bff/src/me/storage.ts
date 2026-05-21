import { getDatabasePool } from '../infra/storage';

// Row shapes returned to the Web client. Mirror the TS types in
// apps/web/app/lib/storage.ts so the Server Action wrapper in PR
// 3.1-D can pass values through unchanged.

export interface LastPracticedRow {
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

export type BestScoresMap = Record<string, BestScoreEntry>;

export interface PracticeAttemptRow {
  id: string;
  surahId: string;
  surahNameEn: string;
  ayahNumber: number;
  score: number | null;
  jobId: string;
  status: 'COMPLETED' | 'FAILED';
  durationMs: number | null;
  createdAt: string;
}

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

export type LastPracticedInput = Omit<LastPracticedRow, never>;

export type PracticeAttemptInput = Omit<PracticeAttemptRow, 'id' | 'createdAt'> & {
  // The Web is the source of truth for the createdAt; honour it on
  // INSERT so client-side and BFF-side timestamps don't disagree on
  // the History view's ordering.
  createdAt: string;
};

export const upsertLastPracticed = async (
  userId: string,
  input: LastPracticedInput
): Promise<LastPracticedRow> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  await pool.query(
    `
    INSERT INTO last_practiced (
      user_id, surah_id, ayah_number,
      surah_name_en, surah_name_ar, ayah_count,
      practiced_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      surah_id      = EXCLUDED.surah_id,
      ayah_number   = EXCLUDED.ayah_number,
      surah_name_en = EXCLUDED.surah_name_en,
      surah_name_ar = EXCLUDED.surah_name_ar,
      ayah_count    = EXCLUDED.ayah_count,
      practiced_at  = EXCLUDED.practiced_at,
      updated_at    = NOW()
    `,
    [
      userId,
      input.surahId,
      input.ayahNumber,
      input.surahNameEn,
      input.surahNameAr,
      input.ayahCount,
      input.practicedAt
    ]
  );
  return input;
};

export const upsertBestScore = async (
  userId: string,
  surahId: string,
  ayahNumber: number,
  entry: BestScoreEntry
): Promise<BestScoreEntry> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  // Best-score writes are commutative under MAX: a lower-score upload
  // from a device whose local cache is stale must not clobber a
  // higher-score row written by another device. `achieved_at` follows
  // the winning score so the surfaced timestamp matches the surfaced
  // value. `RETURNING` gives the caller the actually-stored row so
  // its local cache can converge on the server's view without an
  // extra round-trip.
  const result = await pool.query(
    `
    INSERT INTO best_scores (user_id, surah_id, ayah_number, score, achieved_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, surah_id, ayah_number) DO UPDATE SET
      score       = GREATEST(EXCLUDED.score, best_scores.score),
      achieved_at = CASE
        WHEN EXCLUDED.score > best_scores.score THEN EXCLUDED.achieved_at
        ELSE best_scores.achieved_at
      END
    RETURNING score, achieved_at
    `,
    [userId, surahId, ayahNumber, entry.score, entry.achievedAt]
  );
  const row = result.rows[0] as { score: number; achieved_at: Date | string };
  const achievedAt =
    row.achieved_at instanceof Date ? row.achieved_at.toISOString() : String(row.achieved_at);
  return { score: Number(row.score), achievedAt };
};

export const recordPracticeAttempt = async (
  userId: string,
  input: PracticeAttemptInput
): Promise<PracticeAttemptRow> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');
  const result = await pool.query(
    `
    INSERT INTO practice_attempts (
      user_id, surah_id, surah_name_en, ayah_number,
      score, job_id, status, duration_ms, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
    `,
    [
      userId,
      input.surahId,
      input.surahNameEn,
      input.ayahNumber,
      input.score,
      input.jobId,
      input.status,
      input.durationMs,
      input.createdAt
    ]
  );
  return {
    id: result.rows[0].id,
    ...input
  };
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
