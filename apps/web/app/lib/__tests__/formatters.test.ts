import { describe, it, expect } from 'vitest';
import { summarizeSurah, describeUploadTarget, extractSegmentScores } from '../formatters';
import { mockSurahs, mockSignedUploadUrl, mockScoringResult } from '../../../test/fixtures/testData';

describe('formatters', () => {
  describe('summarizeSurah', () => {
    it('formats surah summary correctly', () => {
      const surah = mockSurahs[0];
      expect(summarizeSurah(surah)).toBe('Al-Fatihah • Meccan • 7 ayahs');
    });

    it('handles different surah with larger ayah count', () => {
      const surah = mockSurahs[1];
      expect(summarizeSurah(surah)).toBe('Al-Baqarah • Medinan • 286 ayahs');
    });

    it('handles surah with special characters in name', () => {
      const surah = mockSurahs[2];
      expect(summarizeSurah(surah)).toBe('An-Nas • Meccan • 6 ayahs');
    });

    it('preserves exact format with bullet separator', () => {
      const result = summarizeSurah(mockSurahs[0]);
      expect(result).toMatch(/^.+ • .+ • \d+ ayahs$/);
    });
  });

  describe('describeUploadTarget', () => {
    it('formats upload target with PUT method, URL and expiration', () => {
      const result = describeUploadTarget(mockSignedUploadUrl);
      expect(result).toBe(
        'PUT https://storage.example.com/upload (expires 2024-12-31T23:59:59.000Z)'
      );
    });

    it('includes full URL in description', () => {
      const result = describeUploadTarget(mockSignedUploadUrl);
      expect(result).toContain(mockSignedUploadUrl.url);
    });

    it('includes expiration timestamp', () => {
      const result = describeUploadTarget(mockSignedUploadUrl);
      expect(result).toContain(mockSignedUploadUrl.expiresAt);
    });

    it('starts with PUT method', () => {
      const result = describeUploadTarget(mockSignedUploadUrl);
      expect(result).toMatch(/^PUT /);
    });
  });

  describe('extractSegmentScores', () => {
    it('extracts label and score from each segment', () => {
      const result = extractSegmentScores(mockScoringResult);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: 'word1', score: 0.95 });
      expect(result[1]).toEqual({ label: 'word2', score: 0.78 });
      expect(result[2]).toEqual({ label: 'word3', score: 0.65 });
    });

    it('preserves segment order', () => {
      const result = extractSegmentScores(mockScoringResult);

      expect(result[0].label).toBe('word1');
      expect(result[1].label).toBe('word2');
      expect(result[2].label).toBe('word3');
    });

    it('handles empty segments array', () => {
      const emptyResult = {
        ...mockScoringResult,
        segments: []
      };

      const result = extractSegmentScores(emptyResult);
      expect(result).toEqual([]);
    });

    it('returns only label and score, excluding metrics', () => {
      const result = extractSegmentScores(mockScoringResult);

      result.forEach((item) => {
        expect(Object.keys(item)).toEqual(['label', 'score']);
        expect(item).not.toHaveProperty('metrics');
      });
    });

    it('preserves exact score values', () => {
      const result = extractSegmentScores(mockScoringResult);

      expect(result[0].score).toBe(0.95);
      expect(result[1].score).toBe(0.78);
      expect(result[2].score).toBe(0.65);
    });
  });
});
