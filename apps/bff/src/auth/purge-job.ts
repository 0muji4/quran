import { logger } from '../telemetry';
import { purgeExpiredSoftDeletedUsers } from './users';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// One run of the soft-delete purge. Wraps the SQL query in a try/catch
// so a transient DB error doesn't tear down the scheduler. The count
// goes to the log every run — including zero — so support / on-call
// can confirm the job is alive without separately probing the DB.
export const runSoftDeletePurgeOnce = async (): Promise<void> => {
  try {
    const purged = await purgeExpiredSoftDeletedUsers();
    logger.info('soft-delete purge complete', { purged });
  } catch (error) {
    logger.error('soft-delete purge failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Schedule the purge to run on startup and then every `intervalMs`.
// The default interval is 24 hours, matching ADR-0024 §5 ("at most
// once per day"). Tests pass a shorter interval to avoid 24-hour
// waits.
//
// Returns a stop function so tests can tear the timer down. In
// production the timer outlives the process and is reaped by the OS
// when the BFF exits.
export const startSoftDeletePurger = (intervalMs: number = DAY_IN_MS): (() => void) => {
  // Fire once on startup so a fresh deploy doesn't wait a full day
  // before catching up.
  void runSoftDeletePurgeOnce();
  const timer = setInterval(() => {
    void runSoftDeletePurgeOnce();
  }, intervalMs);
  // Don't block process exit on a queued timer fire — same posture
  // as other background tasks in the BFF.
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    timer.unref();
  }
  return () => clearInterval(timer);
};
