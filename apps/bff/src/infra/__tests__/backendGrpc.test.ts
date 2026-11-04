import { Server, ServerCredentials, status, type sendUnaryData } from '@grpc/grpc-js';
import { propagation } from '@opentelemetry/api';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  ScoringServiceService,
  ScoringStatus,
  type CreateScoringJobRequest,
  type ScoringServiceServer
} from '../../gen/quran/v1/scoring';
import { SurahServiceService, type SurahServiceServer } from '../../gen/quran/v1/surah';

vi.mock('../../telemetry/telemetry', async () => {
  const { trace } = await import('@opentelemetry/api');
  return { telemetry: { tracer: trace.getTracer('test') } };
});

import {
  fetchAyahFromBackend,
  fetchAyahsFromBackend,
  fetchSurahFromBackend,
  fetchSurahsFromBackend
} from '../backendClient';
import { getBackendGrpc, resetBackendGrpc } from '../backendGrpc';

const surah = {
  id: 1,
  nameAr: 'الفاتحة',
  nameEn: 'Al-Fatiha',
  revelationPlace: 'Makkah',
  ayahCount: 7,
  metadata: { juz: 1 },
  createTime: new Date('2026-06-01T00:00:00.000Z'),
  updateTime: new Date('2026-06-01T00:00:00.000Z')
};

const ayah = {
  id: 7,
  surahId: 1,
  ayahNumber: 1,
  textAr: 'بسم الله',
  textEn: '',
  transliteration: 'bismillah',
  metadata: undefined,
  createTime: undefined,
  updateTime: undefined
};

const notFound = <T>(callback: sendUnaryData<T>): void =>
  callback({ code: status.NOT_FOUND, details: 'not found' }, null);

let lastCreate: CreateScoringJobRequest | undefined;
let lastTraceparent: unknown;
let failAyahs = false;

const surahImpl: SurahServiceServer = {
  listSurahs: (_call, callback) => callback(null, { surahs: [surah] }),
  getSurah: (call, callback) => {
    if (call.request.surahId === 1) {
      callback(null, { surah });
      return;
    }
    notFound(callback);
  },
  listAyahs: (call, callback) => {
    lastTraceparent = call.metadata.get('traceparent')[0];
    if (failAyahs) {
      callback({ code: status.INTERNAL, details: 'boom' }, null);
      return;
    }
    callback(null, { ayahs: [ayah] });
  },
  getAyah: (call, callback) => {
    if (call.request.ayahNumber === 1) {
      callback(null, { ayah });
      return;
    }
    notFound(callback);
  }
};

const scoringImpl: ScoringServiceServer = {
  createScoringJob: (call, callback) => {
    lastCreate = call.request;
    callback(null, {
      job: {
        sessionId: call.request.sessionId,
        uploadKey: call.request.uploadKey,
        status: ScoringStatus.SCORING_STATUS_COMPLETED,
        score: 0.88,
        segments: [],
        evaluation: { accuracy: 0.9, alignments: [{ op: 'match' }] },
        createTime: new Date('2026-06-01T00:00:00.000Z')
      }
    });
  },
  getScoringJob: (call, callback) => {
    if (call.request.sessionId === 'running' || call.request.sessionId === 'unspecified') {
      callback(null, {
        job: {
          sessionId: call.request.sessionId,
          uploadKey: 'u',
          status:
            call.request.sessionId === 'running'
              ? ScoringStatus.SCORING_STATUS_RUNNING
              : ScoringStatus.SCORING_STATUS_UNSPECIFIED,
          segments: undefined,
          evaluation: undefined,
          createTime: undefined
        }
      });
      return;
    }
    if (call.request.sessionId === 'empty') {
      callback(null, { job: undefined });
      return;
    }
    if (call.request.sessionId === 'broken') {
      callback({ code: status.INTERNAL, details: 'boom' }, null);
      return;
    }
    notFound(callback);
  }
};

describe('backend gRPC client', () => {
  const server = new Server();

  beforeAll(async () => {
    server.addService(SurahServiceService, surahImpl);
    server.addService(ScoringServiceService, scoringImpl);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, bound) =>
        error ? reject(error) : resolve(bound)
      );
    });
    process.env.BACKEND_GRPC_ADDR = `127.0.0.1:${port}`;
    process.env.BACKEND_GRPC_TLS = 'false';
  });

  afterEach(() => {
    failAyahs = false;
  });

  afterAll(() => {
    resetBackendGrpc();
    server.forceShutdown();
    delete process.env.BACKEND_GRPC_ADDR;
    delete process.env.BACKEND_GRPC_TLS;
  });

  const client = () => {
    const grpc = getBackendGrpc();
    if (!grpc) throw new Error('gRPC client not configured');
    return grpc;
  };

  it('maps surahs to BFF records', async () => {
    await expect(fetchSurahsFromBackend()).resolves.toEqual([
      {
        id: '1',
        nameAr: 'الفاتحة',
        nameEn: 'Al-Fatiha',
        revelationPlace: 'Makkah',
        ayahCount: 7,
        metadata: { juz: 1 },
        ayahs: []
      }
    ]);
  });

  it('loads a surah with its ayahs and normalises empty strings', async () => {
    const record = await fetchSurahFromBackend('1');

    expect(record?.nameEn).toBe('Al-Fatiha');
    expect(record?.ayahs).toEqual([
      {
        id: '1:1',
        surahId: '1',
        ayahNumber: 1,
        textAr: 'بسم الله',
        textEn: undefined,
        transliteration: 'bismillah',
        metadata: undefined
      }
    ]);
  });

  it('returns null for NOT_FOUND surahs', async () => {
    await expect(fetchSurahFromBackend('200')).resolves.toBeNull();
  });

  it('fails the surah lookup when loading its ayahs fails', async () => {
    failAyahs = true;
    await expect(fetchSurahFromBackend('1')).rejects.toMatchObject({ code: status.INTERNAL });
  });

  it('fetches a single ayah', async () => {
    await expect(fetchAyahFromBackend('1', 1)).resolves.toMatchObject({ id: '1:1', ayahNumber: 1 });
  });

  it('returns null for NOT_FOUND ayahs', async () => {
    await expect(fetchAyahFromBackend('1', 99)).resolves.toBeNull();
  });

  it('propagates server failures when listing ayahs', async () => {
    failAyahs = true;
    await expect(fetchAyahsFromBackend('1')).rejects.toMatchObject({ code: status.INTERNAL });
  });

  it('rejects non-numeric surah ids', async () => {
    await expect(fetchAyahsFromBackend('abc')).rejects.toThrow('Invalid surah id: abc');
  });

  it('propagates trace context as metadata', async () => {
    const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    propagation.setGlobalPropagator({
      inject: (_context, carrier, setter) => setter.set(carrier, 'traceparent', traceparent),
      extract: (context) => context,
      fields: () => ['traceparent']
    });

    await fetchAyahsFromBackend('1');

    expect(lastTraceparent).toBe(traceparent);
    propagation.disable();
  });

  it('creates a scoring job and returns the REST-shaped result', async () => {
    const result = await client().createScoringJob({
      sessionId: 'sess-1',
      uploadKey: 'uploads/rec.opus',
      surahId: '1',
      ayahNumber: 2,
      userId: null,
      referenceAudioKey: 'refs/1_2.mp3'
    });

    expect(lastCreate).toMatchObject({
      surahId: 1,
      ayahNumber: 2,
      userId: '',
      referenceAudioKey: 'refs/1_2.mp3'
    });
    expect(result).toEqual({
      jobId: 'sess-1',
      uploadKey: 'uploads/rec.opus',
      status: 'COMPLETED',
      score: 0.88,
      verdict: null,
      segments: [],
      evaluation: { accuracy: 0.9, alignments: [{ op: 'match' }] },
      createdAt: '2026-06-01T00:00:00.000Z'
    });
  });

  it('sends zero for a missing ayah number so the backend rejects it', async () => {
    await client().createScoringJob({
      sessionId: 's',
      uploadKey: 'u',
      surahId: '1',
      ayahNumber: null,
      userId: 'user-1',
      referenceAudioKey: null
    });

    expect(lastCreate).toMatchObject({ ayahNumber: 0, userId: 'user-1', referenceAudioKey: '' });
  });

  it('defaults optional fields for an unfinished job', async () => {
    await expect(client().getScoringJob('running')).resolves.toEqual({
      jobId: 'running',
      uploadKey: 'u',
      status: 'RUNNING',
      score: null,
      verdict: null,
      segments: [],
      evaluation: null,
      createdAt: ''
    });
  });

  it('returns null for NOT_FOUND scoring jobs', async () => {
    await expect(client().getScoringJob('missing')).resolves.toBeNull();
  });

  it('propagates scoring job failures', async () => {
    await expect(client().getScoringJob('broken')).rejects.toMatchObject({ code: status.INTERNAL });
    await expect(client().getScoringJob('empty')).rejects.toThrow('no scoring job');
  });

  it('rejects an unspecified scoring status', async () => {
    await expect(client().getScoringJob('unspecified')).rejects.toThrow('unknown scoring status');
  });

  it('uses TLS unless BACKEND_GRPC_TLS is false', async () => {
    resetBackendGrpc();
    delete process.env.BACKEND_GRPC_TLS;

    await expect(fetchSurahsFromBackend()).rejects.toMatchObject({ code: status.UNAVAILABLE });

    resetBackendGrpc();
    process.env.BACKEND_GRPC_TLS = 'false';
  });

  it('is disabled when BACKEND_GRPC_ADDR is unset', () => {
    const address = process.env.BACKEND_GRPC_ADDR;
    resetBackendGrpc();
    delete process.env.BACKEND_GRPC_ADDR;

    expect(getBackendGrpc()).toBeNull();

    process.env.BACKEND_GRPC_ADDR = address;
  });
});
