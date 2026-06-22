import { getDatabasePool } from '../infra/storage';

// Mirror of the web reciter list in apps/web/app/lib/reciters.ts — keep in
// sync until a reciters source of truth lands (Issue #476).
export const KNOWN_RECITER_IDS = ['husary-muallim'] as const;
export type ReciterId = (typeof KNOWN_RECITER_IDS)[number];

// Mirror of the web PracticePreferences type in apps/web/app/actions.ts.
export interface PracticePreferences {
  referenceReciterId: string;
  defaultPlaybackSpeed: number;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm" (24h)
}

export type PracticePreferencesPatch = Partial<PracticePreferences>;

// Returned by GET when the user has no row yet, so the UI always has values
// to render. Mirrors the migration column defaults.
export const DEFAULT_PREFERENCES: PracticePreferences = {
  referenceReciterId: 'husary-muallim',
  defaultPlaybackSpeed: 1,
  dailyReminderEnabled: false,
  dailyReminderTime: '08:00'
};

const PREFERENCES_COLUMNS =
  'reference_reciter_id, default_playback_speed, daily_reminder_enabled, daily_reminder_time';

// pg returns NUMERIC as a string and TIME as "HH:mm:ss"; normalise to the
// API contract (number, "HH:mm").
const mapRow = (row: Record<string, unknown>): PracticePreferences => ({
  referenceReciterId: row.reference_reciter_id as string,
  defaultPlaybackSpeed: Number(row.default_playback_speed),
  dailyReminderEnabled: row.daily_reminder_enabled as boolean,
  dailyReminderTime: String(row.daily_reminder_time).slice(0, 5)
});

const COLUMN_BY_FIELD: Record<keyof PracticePreferences, string> = {
  referenceReciterId: 'reference_reciter_id',
  defaultPlaybackSpeed: 'default_playback_speed',
  dailyReminderEnabled: 'daily_reminder_enabled',
  dailyReminderTime: 'daily_reminder_time'
};

export const getUserPreferences = async (userId: string): Promise<PracticePreferences> => {
  const pool = getDatabasePool();
  if (!pool) return DEFAULT_PREFERENCES;
  const result = await pool.query(
    `SELECT ${PREFERENCES_COLUMNS} FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  if (!result.rowCount) return DEFAULT_PREFERENCES;
  return mapRow(result.rows[0]);
};

// Column-level partial upsert: only patched fields are written, so a PATCH
// never clobbers an unsent column (cf. updateUserProfile). Omitted columns
// take the table DEFAULTs on INSERT.
export const upsertUserPreferences = async (
  userId: string,
  patch: PracticePreferencesPatch
): Promise<PracticePreferences> => {
  const pool = getDatabasePool();
  if (!pool) throw new Error('database not configured');

  const fields = (Object.keys(COLUMN_BY_FIELD) as (keyof PracticePreferences)[]).filter((field) =>
    Object.prototype.hasOwnProperty.call(patch, field)
  );
  if (fields.length === 0) return getUserPreferences(userId);

  const columns = fields.map((field) => COLUMN_BY_FIELD[field]);
  const values = fields.map((field) => patch[field]);
  const insertColumns = ['user_id', ...columns];
  const placeholders = insertColumns.map((_column, i) => `$${i + 1}`);
  const assignments = columns.map((column) => `${column} = EXCLUDED.${column}`);

  const result = await pool.query(
    `
    INSERT INTO user_preferences (${insertColumns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (user_id) DO UPDATE SET
      ${assignments.join(', ')},
      updated_at = NOW()
    RETURNING ${PREFERENCES_COLUMNS}
    `,
    [userId, ...values]
  );
  return mapRow(result.rows[0]);
};
