import { describe, it, expect } from 'vitest';
import { everyAyahSourceUrl, referenceAudioKey } from '../referenceAudio';

describe('referenceAudioKey', () => {
  it('formats Surah 1 / Ayah 1 with three-digit padding', () => {
    expect(referenceAudioKey(1, 1)).toBe('reference-audio/001001.mp3');
  });

  it('formats the largest valid (surah, ayah) pair', () => {
    expect(referenceAudioKey(114, 6)).toBe('reference-audio/114006.mp3');
  });

  it('formats Surah Al-Baqarah / final ayah with no padding overflow', () => {
    expect(referenceAudioKey(2, 286)).toBe('reference-audio/002286.mp3');
  });

  it.each([
    [0, 1],
    [115, 1],
    [1, 0],
    [1, 287],
    [1.5, 1],
    [Number.NaN, 1]
  ])('throws RangeError for invalid (surah=%s, ayah=%s)', (surah, ayah) => {
    expect(() => referenceAudioKey(surah, ayah)).toThrow(RangeError);
  });
});

describe('everyAyahSourceUrl', () => {
  it('builds the Husary Muallim URL for Surah 1 / Ayah 1', () => {
    expect(everyAyahSourceUrl(1, 1)).toBe(
      'https://everyayah.com/data/Husary_Muallim_128kbps/001001.mp3'
    );
  });

  it('shares the same padded suffix as referenceAudioKey', () => {
    const url = everyAyahSourceUrl(36, 41);
    const key = referenceAudioKey(36, 41);
    expect(url.endsWith(key.replace('reference-audio/', ''))).toBe(true);
  });

  it('throws on out-of-range input', () => {
    expect(() => everyAyahSourceUrl(0, 1)).toThrow(RangeError);
  });
});
