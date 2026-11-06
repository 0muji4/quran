const WINDOW_MS = 60 * 60 * 1000;
const MAX_JOBS_PER_WINDOW = 60;

const recentJobs = new Map<string, number[]>();

export class ScoringQuotaExceededError extends Error {
  constructor() {
    super('scoring job limit reached');
    this.name = 'ScoringQuotaExceededError';
  }
}

/** Records a scoring job for the user, or throws once the hourly limit is reached. */
export const consumeScoringQuota = (userId: string, now = Date.now()): void => {
  const inWindow = (recentJobs.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (inWindow.length >= MAX_JOBS_PER_WINDOW) {
    recentJobs.set(userId, inWindow);
    throw new ScoringQuotaExceededError();
  }
  recentJobs.set(userId, [...inWindow, now]);
};

/** Clears recorded jobs. Used by tests. */
export const resetScoringQuota = (): void => recentJobs.clear();
