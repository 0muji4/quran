import { describe, it, expect } from 'vitest';
import { verdictForScore } from '../verdict';

describe('verdictForScore', () => {
  it('returns "AWAITING SCORE" for null', () => {
    expect(verdictForScore(null).badge).toBe('AWAITING SCORE');
  });

  it('returns "AWAITING SCORE" for NaN', () => {
    expect(verdictForScore(Number.NaN).badge).toBe('AWAITING SCORE');
  });

  it('returns "MASTERED" for >= 90', () => {
    expect(verdictForScore(90).badge).toBe('MASTERED');
    expect(verdictForScore(100).badge).toBe('MASTERED');
  });

  it('returns "GREAT WORK" for 70..89', () => {
    expect(verdictForScore(70).badge).toBe('GREAT WORK');
    expect(verdictForScore(89).badge).toBe('GREAT WORK');
  });

  it('returns "KEEP PRACTISING" with mid-band copy for 40..69', () => {
    expect(verdictForScore(40).badge).toBe('KEEP PRACTISING');
    expect(verdictForScore(69).badge).toBe('KEEP PRACTISING');
    expect(verdictForScore(52).headline).toContain('Some work');
  });

  it('returns "KEEP PRACTISING" with low-band copy for < 40', () => {
    expect(verdictForScore(0).badge).toBe('KEEP PRACTISING');
    expect(verdictForScore(39).badge).toBe('KEEP PRACTISING');
    expect(verdictForScore(10).headline).toContain('Not quite');
  });

  it('uses different headlines for the two KEEP PRACTISING bands', () => {
    expect(verdictForScore(50).headline).not.toBe(verdictForScore(20).headline);
  });
});
