import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestSignedUploadUrl,
  createScoringJobFromUpload,
  fetchScoringJob,
  fetchSurahs,
  fetchSurahAyahs
} from '../actions';
import {
  mockSignedUploadUrl,
  mockScoringResult,
  mockSurahs,
  mockAyahs
} from '../../test/fixtures/testData';

// Mock global fetch
global.fetch = vi.fn();

describe('Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestSignedUploadUrl', () => {
    it('sends POST request with correct payload and returns signed upload URL', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockSignedUploadUrl
      } as Response);

      const result = await requestSignedUploadUrl({
        filename: 'test.webm',
        contentType: 'audio/webm'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/signed-upload-url'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            filename: 'test.webm',
            contentType: 'audio/webm'
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockSignedUploadUrl);
      expect(result.url).toBe('https://storage.example.com/upload');
      expect(result.uploadKey).toBe('uploads/test-upload-key.webm');
      expect(result.sessionId).toBe('session-123');
    });

    it('throws error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid filename' })
      } as Response);

      await expect(
        requestSignedUploadUrl({
          filename: 'invalid.txt',
          contentType: 'text/plain'
        })
      ).rejects.toThrow('Invalid filename');
    });

    it('throws error when response contains error field', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Storage service unavailable' })
      } as Response);

      await expect(
        requestSignedUploadUrl({
          filename: 'test.webm',
          contentType: 'audio/webm'
        })
      ).rejects.toThrow('Storage service unavailable');
    });
  });

  describe('createScoringJobFromUpload', () => {
    it('creates job with upload details and returns scoring result', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoringResult
      } as Response);

      const result = await createScoringJobFromUpload({
        sessionId: 'session-123',
        uploadKey: 'uploads/test-upload-key.webm',
        surahId: '1',
        ayahNumber: 1
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/scoring-jobs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sessionId: 'session-123',
            uploadKey: 'uploads/test-upload-key.webm',
            surahId: '1',
            ayahNumber: 1
          })
        })
      );

      expect(result.jobId).toBe('job-123');
      expect(result.status).toBe('COMPLETED');
      expect(result.uploadKey).toBe('uploads/test-upload-key.webm');
    });

    it('handles job creation without sessionId', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoringResult
      } as Response);

      const result = await createScoringJobFromUpload({
        uploadKey: 'uploads/test.webm',
        surahId: '2',
        ayahNumber: 5
      });

      expect(result).toEqual(mockScoringResult);
    });

    it('throws error on failed job creation', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid upload key' })
      } as Response);

      await expect(
        createScoringJobFromUpload({
          uploadKey: 'invalid-key',
          surahId: '1',
          ayahNumber: 1
        })
      ).rejects.toThrow('Invalid upload key');
    });
  });

  describe('fetchScoringJob', () => {
    it('polls for job status and returns scoring result', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoringResult
      } as Response);

      const result = await fetchScoringJob('job-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/scoring-jobs/job-123'),
        expect.objectContaining({
          cache: 'no-store'
        })
      );

      expect(result.jobId).toBe('job-123');
      expect(result.status).toBe('COMPLETED');
    });

    it('returns job with segments when available', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoringResult
      } as Response);

      const result = await fetchScoringJob('job-123');

      expect(result.segments).toHaveLength(3);
      expect(result.score).toBe(0.85);
      expect(result.feedback).toBeDefined();
    });

    it('throws error when job not found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ error: 'Job not found' })
      } as Response);

      await expect(fetchScoringJob('nonexistent-job')).rejects.toThrow('Job not found');
    });
  });

  describe('fetchSurahs', () => {
    it('fetches and unwraps surahs array', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ surahs: mockSurahs })
      } as Response);

      const result = await fetchSurahs();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rsc/surahs'),
        expect.objectContaining({
          cache: 'no-store'
        })
      );

      expect(result).toEqual(mockSurahs);
      expect(result).toHaveLength(3);
      expect(result[0].nameEn).toBe('Al-Fatihah');
    });

    it('returns correct surah data structure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ surahs: mockSurahs })
      } as Response);

      const result = await fetchSurahs();

      result.forEach((surah) => {
        expect(surah).toHaveProperty('id');
        expect(surah).toHaveProperty('nameEn');
        expect(surah).toHaveProperty('nameAr');
        expect(surah).toHaveProperty('ayahCount');
        expect(surah).toHaveProperty('revelationPlace');
      });
    });

    it('throws error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Database error' })
      } as Response);

      await expect(fetchSurahs()).rejects.toThrow('Database error');
    });
  });

  describe('fetchSurahAyahs', () => {
    it('fetches ayahs for specific surah', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ ayahs: mockAyahs })
      } as Response);

      const result = await fetchSurahAyahs('1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rsc/surah/1/ayahs'),
        expect.objectContaining({
          cache: 'no-store'
        })
      );

      expect(result).toEqual(mockAyahs);
      expect(result).toHaveLength(3);
    });

    it('returns ayahs with correct structure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ ayahs: mockAyahs })
      } as Response);

      const result = await fetchSurahAyahs('1');

      result.forEach((ayah) => {
        expect(ayah).toHaveProperty('id');
        expect(ayah).toHaveProperty('surahId');
        expect(ayah).toHaveProperty('ayahNumber');
        expect(ayah).toHaveProperty('textAr');
      });
    });

    it('includes surah ID in URL path', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ ayahs: mockAyahs })
      } as Response);

      await fetchSurahAyahs('114');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rsc/surah/114/ayahs'),
        expect.any(Object)
      );
    });

    it('throws error when surah not found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Surah not found' })
      } as Response);

      await expect(fetchSurahAyahs('999')).rejects.toThrow('Surah not found');
    });
  });

  describe('Network error handling', () => {
    it('handles fetch network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(fetchSurahs()).rejects.toThrow('Network error');
    });

    it('handles timeout errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Request timeout'));

      await expect(
        requestSignedUploadUrl({
          filename: 'test.webm',
          contentType: 'audio/webm'
        })
      ).rejects.toThrow('Request timeout');
    });

    it('handles JSON parse errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      await expect(fetchSurahs()).rejects.toThrow('Invalid JSON');
    });
  });
});
