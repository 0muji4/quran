import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../telemetry/logger';
import { getDatabasePool, resetDatabasePool } from '../storage';

describe('getDatabasePool', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://app:app@127.0.0.1:1/app';
  });

  afterEach(async () => {
    await resetDatabasePool();
    process.env.DATABASE_URL = originalUrl;
    vi.restoreAllMocks();
  });

  it('logs idle connection errors instead of crashing the process', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    const pool = getDatabasePool();

    // pg emits this when the server drops an idle client. With no listener,
    // EventEmitter throws it, and that takes down the process.
    expect(() =>
      pool?.emit('error', new Error('terminating connection'), undefined as never)
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      'idle postgres connection error',
      expect.objectContaining({ error: 'terminating connection' })
    );
  });
});
