import { telemetry } from './telemetry';

const meter = telemetry.meter;

// Custom business metrics
const sessionsCreatedCounter = meter.createCounter('quran.sessions.created.total', {
  description: 'Total number of Quran recitation sessions created'
});

const sessionsCompletedCounter = meter.createCounter('quran.sessions.completed.total', {
  description: 'Total number of Quran recitation sessions completed'
});

/**
 * Record a new session creation
 */
export const recordSessionCreated = (userId: string): void => {
  sessionsCreatedCounter.add(1, { user_id: userId });
};

/**
 * Record a completed session with accuracy score
 */
export const recordSessionCompleted = (userId: string, accuracyScore: number): void => {
  sessionsCompletedCounter.add(1, {
    user_id: userId,
    accuracy_bucket: getAccuracyBucket(accuracyScore)
  });
};

/**
 * Helper function to bucket accuracy scores
 */
function getAccuracyBucket(score: number): string {
  if (score >= 0.9) return '90-100';
  if (score >= 0.8) return '80-90';
  if (score >= 0.7) return '70-80';
  if (score >= 0.6) return '60-70';
  return 'below-60';
}
