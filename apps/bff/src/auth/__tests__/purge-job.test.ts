import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSoftDeletePurgeOnce, startSoftDeletePurger } from '../purge-job';
import { purgeExpiredSoftDeletedUsers } from '../users';
import { logger } from '../../telemetry';

vi.mock('../users', () => ({
  purgeExpiredSoftDeletedUsers: vi.fn()
}));

vi.mock('../../telemetry', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

describe('soft-delete purge job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the SQL purge and logs the row count', async () => {
    vi.mocked(purgeExpiredSoftDeletedUsers).mockResolvedValue(3);

    await runSoftDeletePurgeOnce();

    expect(purgeExpiredSoftDeletedUsers).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      'soft-delete purge complete',
      expect.objectContaining({ purged: 3 })
    );
  });

  it('swallows DB errors so the scheduler keeps running', async () => {
    vi.mocked(purgeExpiredSoftDeletedUsers).mockRejectedValue(new Error('connection refused'));

    // Must not reject — the timer's `void runSoftDeletePurgeOnce()`
    // would otherwise become an unhandled rejection.
    await expect(runSoftDeletePurgeOnce()).resolves.toBeUndefined();
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      'soft-delete purge failed',
      expect.objectContaining({ error: 'connection refused' })
    );
  });

  it('fires on each interval tick after the startup call', async () => {
    vi.useFakeTimers();
    vi.mocked(purgeExpiredSoftDeletedUsers).mockResolvedValue(0);

    const stop = startSoftDeletePurger(1000);

    // The startup call is fire-and-forget. Let microtasks flush so
    // the awaited query inside it completes, then snapshot the count
    // as the baseline — we only care about whether subsequent timer
    // ticks fire on top of it.
    await vi.advanceTimersByTimeAsync(0);
    const baseline = vi.mocked(purgeExpiredSoftDeletedUsers).mock.calls.length;
    expect(baseline).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(purgeExpiredSoftDeletedUsers).toHaveBeenCalledTimes(baseline + 1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(purgeExpiredSoftDeletedUsers).toHaveBeenCalledTimes(baseline + 2);

    stop();
  });

  it('stops firing after the returned stop fn is called', async () => {
    vi.useFakeTimers();
    vi.mocked(purgeExpiredSoftDeletedUsers).mockResolvedValue(0);

    const stop = startSoftDeletePurger(1000);
    await vi.advanceTimersByTimeAsync(0);
    const baseline = vi.mocked(purgeExpiredSoftDeletedUsers).mock.calls.length;

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    // No additional fires after stop().
    expect(purgeExpiredSoftDeletedUsers).toHaveBeenCalledTimes(baseline);
  });
});
