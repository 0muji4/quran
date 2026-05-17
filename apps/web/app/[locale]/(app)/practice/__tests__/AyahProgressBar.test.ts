import { describe, it, expect } from 'vitest';
import { indicatorOffsetPercent } from '../AyahProgressBar';

describe('indicatorOffsetPercent', () => {
  it('pins ayah 1 to the left of the track', () => {
    expect(indicatorOffsetPercent(1, 286)).toBe(0);
  });

  it('pins the final ayah to the right of the track', () => {
    expect(indicatorOffsetPercent(286, 286)).toBe(100);
  });

  it('places mid-surah ayahs proportionally', () => {
    // (47 - 1) / (286 - 1) = 46 / 285
    expect(indicatorOffsetPercent(47, 286)).toBeCloseTo((46 / 285) * 100, 5);
  });

  it('pins single-ayah surahs to the left (no division by zero)', () => {
    expect(indicatorOffsetPercent(1, 1)).toBe(0);
  });

  it('clamps an out-of-range low ayah back to ayah 1', () => {
    expect(indicatorOffsetPercent(0, 7)).toBe(0);
  });

  it('clamps an out-of-range high ayah back to the final ayah', () => {
    expect(indicatorOffsetPercent(999, 7)).toBe(100);
  });
});
