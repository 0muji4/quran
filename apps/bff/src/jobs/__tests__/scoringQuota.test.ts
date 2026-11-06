import { beforeEach, describe, expect, it } from 'vitest';
import { consumeScoringQuota, resetScoringQuota, ScoringQuotaExceededError } from '../scoringQuota';

const HOUR_MS = 60 * 60 * 1000;

describe('consumeScoringQuota', () => {
  beforeEach(() => resetScoringQuota());

  const fill = (userId: string, now: number) => {
    for (let i = 0; i < 60; i += 1) consumeScoringQuota(userId, now);
  };

  it('rejects jobs past the hourly limit', () => {
    fill('user-1', 0);

    expect(() => consumeScoringQuota('user-1', 1)).toThrow(ScoringQuotaExceededError);
  });

  it('counts each user separately', () => {
    fill('user-1', 0);

    expect(() => consumeScoringQuota('user-2', 1)).not.toThrow();
  });

  it('allows jobs again after the window passes', () => {
    fill('user-1', 0);

    expect(() => consumeScoringQuota('user-1', HOUR_MS)).not.toThrow();
  });
});
