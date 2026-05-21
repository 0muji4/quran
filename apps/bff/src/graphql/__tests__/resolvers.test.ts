import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLContext, Resolvers } from '@quran-project/shared-ts';
import { resolvers } from '../resolvers';
import type { SurahRecord, AyahRecord } from '../../infra/backendClient';

/**
 * Returns a defined resolver entry, throwing if it is absent. Replaces
 * non-null assertions on the optional `Resolvers` map (Google Style Guide).
 */
function getResolver<T extends keyof Resolvers, F extends keyof NonNullable<Resolvers[T]>>(
  type: T,
  field: F
): NonNullable<NonNullable<Resolvers[T]>[F]> {
  const group = resolvers[type];
  if (group == null) {
    throw new Error(`Resolver group not defined: ${String(type)}`);
  }
  const entry = (group as NonNullable<Resolvers[T]>)[field];
  if (entry == null) {
    throw new Error(`Resolver not defined: ${String(type)}.${String(field)}`);
  }
  return entry as NonNullable<NonNullable<Resolvers[T]>[F]>;
}

// Mock the infra module
vi.mock('../../infra', () => ({
  fetchSurahsFromBackend: vi.fn(),
  fetchSurahFromBackend: vi.fn(),
  fetchAyahFromBackend: vi.fn()
}));

// Mock the jobs module
vi.mock('../../jobs', () => ({
  createScoringJob: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  getScoringJob: vi.fn()
}));

const mockSurahs: SurahRecord[] = [
  {
    id: '1',
    nameAr: 'الفاتحة',
    nameEn: 'Al-Fatiha',
    revelationPlace: 'Mecca',
    ayahCount: 7,
    metadata: { order: 1 },
    ayahs: []
  },
  {
    id: '2',
    nameAr: 'البقرة',
    nameEn: 'Al-Baqarah',
    revelationPlace: 'Medina',
    ayahCount: 286,
    metadata: { order: 2 },
    ayahs: []
  },
  {
    id: '3',
    nameAr: 'آل عمران',
    nameEn: 'Ali Imran',
    revelationPlace: 'Medina',
    ayahCount: 200,
    metadata: { order: 3 },
    ayahs: []
  }
];

const mockAyahs: AyahRecord[] = [
  {
    id: '1:1',
    surahId: '1',
    ayahNumber: 1,
    textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    textEn: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    transliteration: 'Bismillahir Rahmanir Raheem',
    metadata: { juz: 1 }
  },
  {
    id: '1:2',
    surahId: '1',
    ayahNumber: 2,
    textAr: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    textEn: '[All] praise is [due] to Allah, Lord of the worlds',
    transliteration: 'Alhamdu lillahi rabbil aalameen',
    metadata: { juz: 1 }
  }
];

describe('GraphQL Resolvers', () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      session: {
        id: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User'
      },
      requestId: 'test-request-123'
    };
  });

  describe('Query.surahs', () => {
    it('returns all surahs without pagination', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockResolvedValue(mockSurahs);

      const result = await getResolver('Query', 'surahs')(null, {}, mockContext);

      expect(fetchSurahsFromBackend).toHaveBeenCalledOnce();
      expect(result).toHaveLength(3);
      expect(result[0].nameEn).toBe('Al-Fatiha');
    });

    it('applies limit when provided', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockResolvedValue(mockSurahs);

      const result = await getResolver('Query', 'surahs')(null, { limit: 2 }, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].nameEn).toBe('Al-Fatiha');
      expect(result[1].nameEn).toBe('Al-Baqarah');
    });

    it('applies offset when provided', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockResolvedValue(mockSurahs);

      const result = await getResolver('Query', 'surahs')(null, { offset: 1 }, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].nameEn).toBe('Al-Baqarah');
      expect(result[1].nameEn).toBe('Ali Imran');
    });

    it('applies both limit and offset', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockResolvedValue(mockSurahs);

      const result = await getResolver('Query', 'surahs')(
        null,
        { limit: 1, offset: 1 },
        mockContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].nameEn).toBe('Al-Baqarah');
    });

    it('returns empty array when offset exceeds array length', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockResolvedValue(mockSurahs);

      const result = await getResolver('Query', 'surahs')(null, { offset: 10 }, mockContext);

      expect(result).toHaveLength(0);
    });

    it('propagates errors from backend', async () => {
      const { fetchSurahsFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahsFromBackend).mockRejectedValue(new Error('Backend error'));

      await expect(getResolver('Query', 'surahs')(null, {}, mockContext)).rejects.toThrow(
        'Backend error'
      );
    });
  });

  describe('Query.surah', () => {
    it('returns surah by id', async () => {
      const { fetchSurahFromBackend } = await import('../../infra');
      const surahWithAyahs = { ...mockSurahs[0], ayahs: mockAyahs };
      vi.mocked(fetchSurahFromBackend).mockResolvedValue(surahWithAyahs);

      const result = await getResolver('Query', 'surah')(null, { id: '1' }, mockContext);

      expect(fetchSurahFromBackend).toHaveBeenCalledWith('1');
      expect(result).toEqual(surahWithAyahs);
      expect(result?.nameEn).toBe('Al-Fatiha');
      expect(result?.ayahs).toHaveLength(2);
    });

    it('returns null when surah not found', async () => {
      const { fetchSurahFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahFromBackend).mockResolvedValue(null);

      const result = await getResolver('Query', 'surah')(null, { id: '999' }, mockContext);

      expect(result).toBeNull();
    });

    it('propagates errors from backend', async () => {
      const { fetchSurahFromBackend } = await import('../../infra');
      vi.mocked(fetchSurahFromBackend).mockRejectedValue(new Error('Backend error'));

      await expect(getResolver('Query', 'surah')(null, { id: '1' }, mockContext)).rejects.toThrow(
        'Backend error'
      );
    });
  });

  describe('Query.ayah', () => {
    it('returns ayah by surahId and ayahNumber', async () => {
      const { fetchAyahFromBackend } = await import('../../infra');
      vi.mocked(fetchAyahFromBackend).mockResolvedValue(mockAyahs[0]);

      const result = await getResolver('Query', 'ayah')(
        null,
        { surahId: '1', ayahNumber: 1 },
        mockContext
      );

      expect(fetchAyahFromBackend).toHaveBeenCalledWith('1', 1);
      expect(result).toEqual(mockAyahs[0]);
      expect(result?.textAr).toBe('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    });

    it('returns null when ayah not found', async () => {
      const { fetchAyahFromBackend } = await import('../../infra');
      vi.mocked(fetchAyahFromBackend).mockResolvedValue(null);

      const result = await getResolver('Query', 'ayah')(
        null,
        { surahId: '1', ayahNumber: 999 },
        mockContext
      );

      expect(result).toBeNull();
    });

    it('propagates errors from backend', async () => {
      const { fetchAyahFromBackend } = await import('../../infra');
      vi.mocked(fetchAyahFromBackend).mockRejectedValue(new Error('Backend error'));

      await expect(
        getResolver('Query', 'ayah')(null, { surahId: '1', ayahNumber: 1 }, mockContext)
      ).rejects.toThrow('Backend error');
    });
  });

  describe('Query.scoringJob', () => {
    it('returns scoring job by jobId', async () => {
      const { getScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-123',
        status: 'completed',
        createdAt: new Date().toISOString(),
        pronunciationFeedback: {
          accuracy: 0.95,
          fluency: 0.9,
          completeness: 0.98,
          overall: 0.94,
          wordAlignments: [],
          wer: 0.05,
          referenceAudioUrl: null
        }
      };
      vi.mocked(getScoringJob).mockResolvedValue(mockJob);

      const result = await getResolver('Query', 'scoringJob')(
        null,
        { jobId: 'job-123' },
        mockContext
      );

      expect(getScoringJob).toHaveBeenCalledWith('job-123');
      expect(result).toEqual(mockJob);
    });

    it('returns null when job not found', async () => {
      const { getScoringJob } = await import('../../jobs');
      vi.mocked(getScoringJob).mockResolvedValue(null);

      const result = await getResolver('Query', 'scoringJob')(
        null,
        { jobId: 'nonexistent' },
        mockContext
      );

      expect(result).toBeNull();
    });
  });

  describe('Mutation.getSignedUploadUrl', () => {
    it('creates signed upload URL with user session', async () => {
      const { createSignedUploadUrl } = await import('../../jobs');
      const mockUploadUrl = {
        sessionId: 'session-123',
        uploadKey: 'uploads/test.opus',
        url: 'https://example.com/upload',
        fields: { key: 'uploads/test.opus' },
        expiresAt: new Date().toISOString()
      };
      vi.mocked(createSignedUploadUrl).mockResolvedValue(mockUploadUrl);

      const input = {
        filename: 'test.opus',
        contentType: 'audio/opus'
      };

      const result = await getResolver('Mutation', 'getSignedUploadUrl')(
        null,
        { input },
        mockContext
      );

      expect(createSignedUploadUrl).toHaveBeenCalledWith({
        ...input,
        userId: 'test-user'
      });
      expect(result).toEqual(mockUploadUrl);
    });

    it('creates signed upload URL without user session', async () => {
      const { createSignedUploadUrl } = await import('../../jobs');
      const mockUploadUrl = {
        sessionId: 'session-456',
        uploadKey: 'uploads/anonymous.opus',
        url: 'https://example.com/upload',
        fields: { key: 'uploads/anonymous.opus' },
        expiresAt: new Date().toISOString()
      };
      vi.mocked(createSignedUploadUrl).mockResolvedValue(mockUploadUrl);

      const input = {
        filename: 'anonymous.opus',
        contentType: 'audio/opus'
      };

      const contextWithoutSession: GraphQLContext = {
        session: null,
        requestId: 'test-request'
      };

      const result = await getResolver('Mutation', 'getSignedUploadUrl')(
        null,
        { input },
        contextWithoutSession
      );

      expect(createSignedUploadUrl).toHaveBeenCalledWith({
        ...input,
        userId: null
      });
      expect(result).toEqual(mockUploadUrl);
    });
  });

  describe('Mutation.createScoringJob', () => {
    it('creates scoring job with all parameters', async () => {
      const { createScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-789',
        status: 'pending',
        createdAt: new Date().toISOString(),
        pronunciationFeedback: null
      };
      vi.mocked(createScoringJob).mockResolvedValue(mockJob);

      const input = {
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1
      };

      const result = await getResolver('Mutation', 'createScoringJob')(
        null,
        { input },
        mockContext
      );

      expect(createScoringJob).toHaveBeenCalledWith({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: 1,
        userId: 'test-user'
      });
      expect(result).toEqual(mockJob);
    });

    it('handles null ayahNumber', async () => {
      const { createScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-null-ayah',
        status: 'pending',
        createdAt: new Date().toISOString(),
        pronunciationFeedback: null
      };
      vi.mocked(createScoringJob).mockResolvedValue(mockJob);

      const input = {
        uploadKey: 'uploads/test.opus',
        surahId: '1'
      };

      const result = await getResolver('Mutation', 'createScoringJob')(
        null,
        { input },
        mockContext
      );

      expect(createScoringJob).toHaveBeenCalledWith({
        uploadKey: 'uploads/test.opus',
        surahId: '1',
        ayahNumber: null,
        userId: 'test-user'
      });
      expect(result).toEqual(mockJob);
    });

    it('uses null userId when session is null', async () => {
      const { createScoringJob } = await import('../../jobs');
      const mockJob = {
        jobId: 'job-anonymous',
        status: 'pending',
        createdAt: new Date().toISOString(),
        pronunciationFeedback: null
      };
      vi.mocked(createScoringJob).mockResolvedValue(mockJob);

      const input = {
        uploadKey: 'uploads/anonymous.opus',
        surahId: '1',
        ayahNumber: 1
      };

      const contextWithoutSession: GraphQLContext = {
        session: null,
        requestId: 'test-request'
      };

      const result = await getResolver('Mutation', 'createScoringJob')(
        null,
        { input },
        contextWithoutSession
      );

      expect(createScoringJob).toHaveBeenCalledWith({
        uploadKey: 'uploads/anonymous.opus',
        surahId: '1',
        ayahNumber: 1,
        userId: null
      });
      expect(result).toEqual(mockJob);
    });
  });

  describe('Surah.ayahs field resolver', () => {
    it('returns all ayahs without pagination', () => {
      const parent = { ...mockSurahs[0], ayahs: mockAyahs };

      const result = getResolver('Surah', 'ayahs')(parent, {}, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].ayahNumber).toBe(1);
    });

    it('applies limit when provided', () => {
      const parent = { ...mockSurahs[0], ayahs: mockAyahs };

      const result = getResolver('Surah', 'ayahs')(parent, { limit: 1 }, mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].ayahNumber).toBe(1);
    });

    it('applies offset when provided', () => {
      const parent = { ...mockSurahs[0], ayahs: mockAyahs };

      const result = getResolver('Surah', 'ayahs')(parent, { offset: 1 }, mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].ayahNumber).toBe(2);
    });

    it('applies both limit and offset', () => {
      const ayahs = [
        ...mockAyahs,
        { ...mockAyahs[0], id: '1:3', ayahNumber: 3 },
        { ...mockAyahs[0], id: '1:4', ayahNumber: 4 }
      ];
      const parent = { ...mockSurahs[0], ayahs };

      const result = getResolver('Surah', 'ayahs')(parent, { limit: 2, offset: 1 }, mockContext);

      expect(result).toHaveLength(2);
      expect(result[0].ayahNumber).toBe(2);
      expect(result[1].ayahNumber).toBe(3);
    });

    it('returns empty array when offset exceeds array length', () => {
      const parent = { ...mockSurahs[0], ayahs: mockAyahs };

      const result = getResolver('Surah', 'ayahs')(parent, { offset: 10 }, mockContext);

      expect(result).toHaveLength(0);
    });
  });

  describe('Scalar types', () => {
    it('JSONObject serializes objects', () => {
      const value = { test: 'value', nested: { key: 123 } };

      const result = getResolver('JSONObject', 'serialize')(value);

      expect(result).toEqual(value);
    });

    it('JSONObject serializes null', () => {
      const result = getResolver('JSONObject', 'serialize')(null);

      expect(result).toBeNull();
    });

    it('JSONObject parseValue accepts objects', () => {
      const value = { test: 'value' };

      const result = getResolver('JSONObject', 'parseValue')(value);

      expect(result).toEqual(value);
    });

    it('JSONObject parseValue rejects non-objects', () => {
      const result = getResolver('JSONObject', 'parseValue')('string');

      expect(result).toBeNull();
    });

    it('DateTime serializes dates to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');

      const result = getResolver('DateTime', 'serialize')(date);

      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('DateTime serializes string dates', () => {
      const dateString = '2024-01-01T00:00:00.000Z';

      const result = getResolver('DateTime', 'serialize')(dateString);

      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('DateTime parseValue accepts strings', () => {
      const dateString = '2024-01-01T00:00:00.000Z';

      const result = getResolver('DateTime', 'parseValue')(dateString);

      expect(result).toBe(dateString);
    });

    it('DateTime parseValue rejects non-strings', () => {
      const result = getResolver('DateTime', 'parseValue')(123);

      expect(result).toBeNull();
    });
  });
});
