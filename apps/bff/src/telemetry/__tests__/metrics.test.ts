import { describe, it, expect } from 'vitest';
import { recordSessionCreated, recordSessionCompleted } from '../metrics';

describe('Metrics', () => {
  it('should record session created without errors', () => {
    expect(() => {
      recordSessionCreated('user-123');
    }).not.toThrow();
  });

  it('should record session completed with accuracy score', () => {
    expect(() => {
      recordSessionCompleted('user-123', 0.95);
    }).not.toThrow();
  });

  it('should handle multiple metric recordings', () => {
    expect(() => {
      recordSessionCreated('user-1');
      recordSessionCreated('user-2');
      recordSessionCompleted('user-1', 0.85);
      recordSessionCompleted('user-2', 0.92);
    }).not.toThrow();
  });
});
