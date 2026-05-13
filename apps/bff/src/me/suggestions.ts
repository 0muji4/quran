import { getDatabasePool } from '../infra/storage';

// Personalised "what to practice next" + per-surah difficulty hints.
//
// The shape returned here is consumed by the Web Library page Server
// Component. `difficulties` is a sparse map keyed by surahId — surahs
// without entries fall back to the existing ayahCount heuristic in
// apps/web/app/lib/classify.ts so the response stays small (the average
// user only has scores for a handful of surahs at any time).
//
// `reason` is not surfaced in the UI today; it is recorded so future
// telemetry / debugging can attribute why a particular suggestion was
// chosen without re-running the selection logic.

export type Difficulty = 'easy' | 'medium' | 'hard';

export type SuggestionReason = 'short_unpracticed' | 'short_low_score' | 'fallback';

export type SuggestedSurah = {
  surahId: string;
  reason: SuggestionReason;
};

export type SuggestionResponse = {
  suggested: SuggestedSurah;
  difficulties: Record<string, Difficulty>;
};

// Difficulty thresholds (closed intervals on the lower bound). Easy /
// medium / hard buckets are calibrated against MVP scoring distribution
// from manual testing: 85+ is "comfortable", 60–84 is "improving", <60
// flags surahs that consistently fail. Tweak together with the Web
// difficulty pill copy if the distribution shifts.
export const EASY_AVG_THRESHOLD = 85;
export const MEDIUM_AVG_THRESHOLD = 60;

// "Has the user practiced this surah recently?" — anything inside this
// window is dropped from the suggestion candidate pool so we recommend
// something the user has not just done. 7 days picked as a placeholder;
// expect to tune once we have real usage data.
export const RECENT_ATTEMPT_WINDOW_DAYS = 7;

// Surah we fall back to when the candidate pool is empty (e.g. brand-new
// user, or one who has practised every short Meccan surah inside the
// recent window). Al-Ikhlas is 4 ayahs and broadly familiar so it makes
// a safe default.
export const FALLBACK_SURAH_ID = '112';

export type AvgScoreRow = {
  surahId: string;
  avgScore: number;
};

export type LastAttemptRow = {
  surahId: string;
  latestAt: Date;
};

export type CandidateSurahRow = {
  surahId: string;
  ayahCount: number;
};

export type SuggestionInputs = {
  avgScores: AvgScoreRow[];
  lastAttempts: LastAttemptRow[];
  shortMeccan: CandidateSurahRow[];
  now: Date;
};

const bucketDifficulty = (avg: number): Difficulty => {
  if (avg >= EASY_AVG_THRESHOLD) return 'easy';
  if (avg >= MEDIUM_AVG_THRESHOLD) return 'medium';
  return 'hard';
};

// Pure selector kept separate from the DB layer so the branching logic
// is unit-testable without spinning up Postgres. Order of preference:
//   1. Short Meccan surahs the user has never attempted (oldest first).
//   2. Short Meccan surahs the user last attempted before the recent
//      window, ranked by avg best-score ascending (the surah they are
//      weakest on bubbles up).
//   3. Hardcoded fallback (Al-Ikhlas) when both candidate pools empty.
export const composeSuggestion = (inputs: SuggestionInputs): SuggestionResponse => {
  const { avgScores, lastAttempts, shortMeccan, now } = inputs;

  const avgBySurah = new Map<string, number>();
  for (const row of avgScores) {
    avgBySurah.set(row.surahId, row.avgScore);
  }

  const lastBySurah = new Map<string, Date>();
  for (const row of lastAttempts) {
    lastBySurah.set(row.surahId, row.latestAt);
  }

  const cutoff = new Date(now.getTime() - RECENT_ATTEMPT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const unpracticed: CandidateSurahRow[] = [];
  const lapsed: CandidateSurahRow[] = [];

  for (const surah of shortMeccan) {
    const last = lastBySurah.get(surah.surahId);
    if (!last) {
      unpracticed.push(surah);
    } else if (last < cutoff) {
      lapsed.push(surah);
    }
  }

  const difficulties: Record<string, Difficulty> = {};
  for (const [surahId, avg] of avgBySurah) {
    difficulties[surahId] = bucketDifficulty(avg);
  }

  if (unpracticed.length > 0) {
    // Determinism: sort by numeric surahId ascending so the same user
    // sees the same suggestion across reloads.
    unpracticed.sort((a, b) => Number(a.surahId) - Number(b.surahId));
    return {
      suggested: { surahId: unpracticed[0].surahId, reason: 'short_unpracticed' },
      difficulties
    };
  }

  if (lapsed.length > 0) {
    // Rank by avg score ascending (weakest surah first), break ties by
    // numeric surahId so the order is reproducible.
    lapsed.sort((a, b) => {
      const aAvg = avgBySurah.get(a.surahId) ?? Number.POSITIVE_INFINITY;
      const bAvg = avgBySurah.get(b.surahId) ?? Number.POSITIVE_INFINITY;
      if (aAvg !== bAvg) return aAvg - bAvg;
      return Number(a.surahId) - Number(b.surahId);
    });
    return {
      suggested: { surahId: lapsed[0].surahId, reason: 'short_low_score' },
      difficulties
    };
  }

  return {
    suggested: { surahId: FALLBACK_SURAH_ID, reason: 'fallback' },
    difficulties
  };
};

const fetchAvgScores = async (userId: string): Promise<AvgScoreRow[]> => {
  const pool = getDatabasePool();
  if (!pool) return [];
  const result = await pool.query(
    `
    SELECT surah_id, AVG(score)::float8 AS avg_score
    FROM best_scores
    WHERE user_id = $1
    GROUP BY surah_id
    `,
    [userId]
  );
  return result.rows.map((row) => ({
    surahId: row.surah_id,
    avgScore: Number(row.avg_score)
  }));
};

const fetchLastAttempts = async (userId: string): Promise<LastAttemptRow[]> => {
  const pool = getDatabasePool();
  if (!pool) return [];
  const result = await pool.query(
    `
    SELECT surah_id, MAX(created_at) AS latest_at
    FROM practice_attempts
    WHERE user_id = $1
    GROUP BY surah_id
    `,
    [userId]
  );
  return result.rows.map((row) => ({
    surahId: row.surah_id,
    latestAt: new Date(row.latest_at)
  }));
};

const fetchShortMeccanSurahs = async (): Promise<CandidateSurahRow[]> => {
  const pool = getDatabasePool();
  if (!pool) return [];
  // best_scores / practice_attempts store surah_id as TEXT (driven by
  // the Web layer using string identifiers), so cast surahs.id (SMALLINT)
  // to text here to keep the join key consistent downstream.
  const result = await pool.query(
    `
    SELECT id::text AS surah_id, ayah_count
    FROM surahs
    WHERE revelation_place = 'Mecca' AND ayah_count <= 10
    `
  );
  return result.rows.map((row) => ({
    surahId: row.surah_id,
    ayahCount: row.ayah_count
  }));
};

export const getSuggestion = async (userId: string): Promise<SuggestionResponse> => {
  const [avgScores, lastAttempts, shortMeccan] = await Promise.all([
    fetchAvgScores(userId),
    fetchLastAttempts(userId),
    fetchShortMeccanSurahs()
  ]);
  return composeSuggestion({
    avgScores,
    lastAttempts,
    shortMeccan,
    now: new Date()
  });
};
