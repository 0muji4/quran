import { describe, it, expect } from 'vitest';
import { verdictForScore } from '../verdict';

describe('verdictForScore', () => {
  it('returns "awaiting" for null', () => {
    expect(verdictForScore(null)).toBe('awaiting');
  });

  it('returns "awaiting" for NaN', () => {
    expect(verdictForScore(Number.NaN)).toBe('awaiting');
  });

  it('returns "mastered" for >= 90', () => {
    expect(verdictForScore(90)).toBe('mastered');
    expect(verdictForScore(100)).toBe('mastered');
  });

  it('returns "great" for 70..89', () => {
    expect(verdictForScore(70)).toBe('great');
    expect(verdictForScore(89)).toBe('great');
  });

  it('returns "midway" for 40..69', () => {
    expect(verdictForScore(40)).toBe('midway');
    expect(verdictForScore(69)).toBe('midway');
    expect(verdictForScore(52)).toBe('midway');
  });

  it('returns "beginner" for < 40', () => {
    expect(verdictForScore(0)).toBe('beginner');
    expect(verdictForScore(39)).toBe('beginner');
    expect(verdictForScore(10)).toBe('beginner');
  });
});
