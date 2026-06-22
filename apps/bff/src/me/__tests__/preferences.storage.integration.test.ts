import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { resetDatabasePool } from '../../infra/storage';
import { setupTestDB } from '../../__tests__/setup';
import { DEFAULT_PREFERENCES, getUserPreferences, upsertUserPreferences } from '../preferences';

const isPostgresAvailable = async (): Promise<boolean> => {
  const probe = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
    user: process.env.TEST_POSTGRES_USER || 'app',
    password: process.env.TEST_POSTGRES_PASSWORD || 'app',
    database: 'postgres',
    connectionTimeoutMillis: 2000
  });
  try {
    await probe.query('SELECT 1');
    await probe.end();
    return true;
  } catch {
    await probe.end();
    return false;
  }
};

const postgresAvailable = await isPostgresAvailable();

// Real-DB coverage for what the mocked route test cannot reach: the dynamic
// partial upsert and the mapRow NUMERIC/TIME normalisation. Applies the real
// migration DDL so the column types under test stay honest.
const USER_PREFERENCES_DDL = readFileSync(
  new URL('../../../../../db/migrations/20260622090000_user_preferences.up.sql', import.meta.url),
  'utf8'
);

const USER_ID = '00000000-0000-0000-0000-0000000000a1';

describe.skipIf(!postgresAvailable)('preferences storage (real DB)', () => {
  let pool: Pool;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const setup = await setupTestDB();
    pool = setup.pool;
    cleanup = setup.cleanup;
    process.env.DATABASE_URL = `postgresql://${pool.options.user}:${pool.options.password}@${pool.options.host}:${pool.options.port}/${pool.options.database}`;
    // Minimal users table to satisfy the FK; the migration owns the real one.
    await pool.query('CREATE TABLE users (id UUID PRIMARY KEY)');
    await pool.query(USER_PREFERENCES_DDL);
    await pool.query('INSERT INTO users (id) VALUES ($1)', [USER_ID]);
  });

  afterAll(async () => {
    await resetDatabasePool();
    if (cleanup) await cleanup();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM user_preferences');
  });

  it('returns defaults without writing a row when none exists', async () => {
    const prefs = await getUserPreferences(USER_ID);

    expect(prefs).toEqual(DEFAULT_PREFERENCES);
    const count = await pool.query('SELECT COUNT(*)::int AS n FROM user_preferences');
    expect(count.rows[0].n).toBe(0);
  });

  it('inserts a partial patch and normalises NUMERIC/TIME on read-back', async () => {
    await upsertUserPreferences(USER_ID, {
      defaultPlaybackSpeed: 1.5,
      dailyReminderEnabled: true,
      dailyReminderTime: '07:05'
    });

    const prefs = await getUserPreferences(USER_ID);

    expect(prefs).toEqual({
      referenceReciterId: 'husary-muallim', // column default, untouched by the patch
      defaultPlaybackSpeed: 1.5,
      dailyReminderEnabled: true,
      dailyReminderTime: '07:05'
    });
    // NUMERIC must surface as a number, not pg's "1.50" string.
    expect(typeof prefs.defaultPlaybackSpeed).toBe('number');
  });

  it('updates only the patched column, leaving the rest intact', async () => {
    await upsertUserPreferences(USER_ID, {
      dailyReminderTime: '21:30',
      dailyReminderEnabled: true
    });
    await upsertUserPreferences(USER_ID, { defaultPlaybackSpeed: 0.75 });

    const prefs = await getUserPreferences(USER_ID);

    expect(prefs.defaultPlaybackSpeed).toBe(0.75);
    expect(prefs.dailyReminderTime).toBe('21:30');
    expect(prefs.dailyReminderEnabled).toBe(true);
  });

  it('returns the stored row directly from upsert, with defaults normalised', async () => {
    const returned = await upsertUserPreferences(USER_ID, { defaultPlaybackSpeed: 2 });

    expect(returned.defaultPlaybackSpeed).toBe(2);
    expect(returned.dailyReminderTime).toBe('08:00');
  });
});
