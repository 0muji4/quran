import { beforeEach, describe, expect, it, vi } from 'vitest';

// scoringJobs.ts reaches object storage and Postgres through ../infra and the
// Go backend through ../infra/backendClient. Mock both so these are pure unit
// tests of the feedback-mapping wiring, not integration tests.
vi.mock('../../infra', () => ({
  ensureReferenceAudio: vi.fn(),
  findSessionIdForUploadKey: vi.fn(),
  getDatabasePool: vi.fn(),
  getMinioClientForPresignedUrls: vi.fn(() => null),
  recordUploadKey: vi.fn()
}));

vi.mock('../../infra/backendClient', () => ({
  fetchWithTracing: vi.fn()
}));

vi.mock('../../infra/backendGrpc', () => ({
  getBackendGrpc: vi.fn(() => null)
}));

import { createScoringJob, getScoringJob, mapEvaluationToFeedback } from '../scoringJobs';

// A representative completed-job evaluation blob, matching the backend's
// persisted shape (snake_case alignment keys, pre-computed dimensions).
const evaluation = {
  accuracy: 0.9,
  fluency: 0.8,
  completeness: 0.95,
  wer: 0.1,
  transcript: 'بسم الله',
  alignments: [
    { ref_word: 'بسم', hyp_word: 'بسم', op: 'match' },
    { ref_word: 'الله', hyp_word: 'الاه', op: 'substitute' },
    { ref_word: 'الرحمن', hyp_word: null, op: 'delete' }
  ]
};

describe('mapEvaluationToFeedback', () => {
  it('projects every pre-computed dimension straight from the evaluation blob', () => {
    const feedback = mapEvaluationToFeedback(evaluation, 0.88, 'https://cdn/ref.mp3');

    expect(feedback).not.toBeNull();
    expect(feedback?.accuracy).toBe(0.9);
    expect(feedback?.fluency).toBe(0.8);
    expect(feedback?.completeness).toBe(0.95);
    // overall comes from the job's `score`, NOT re-derived from the blob.
    expect(feedback?.overall).toBe(0.88);
    expect(feedback?.wer).toBe(0.1);
    expect(feedback?.transcript).toBe('بسم الله');
    expect(feedback?.referenceAudioUrl).toBe('https://cdn/ref.mp3');
  });

  it('regression: fluency / completeness / overall are never hard-zeroed when present', () => {
    // The previous implementation read from an empty asr_results join and
    // returned fluency:0, completeness:0, overall:0. Lock that it cannot return.
    const feedback = mapEvaluationToFeedback(evaluation, 0.88, null);
    expect(feedback?.fluency).not.toBe(0);
    expect(feedback?.completeness).not.toBe(0);
    expect(feedback?.overall).not.toBe(0);
  });

  it('normalizes snake_case alignments to the camelCase WordAlignment shape', () => {
    const feedback = mapEvaluationToFeedback(evaluation, 0.88, null);

    expect(feedback?.wordAlignments).toEqual([
      { refWord: 'بسم', hypWord: 'بسم', op: 'match' },
      { refWord: 'الله', hypWord: 'الاه', op: 'substitute' },
      { refWord: 'الرحمن', hypWord: null, op: 'delete' }
    ]);
  });

  it('returns null when the job has no evaluation yet (RUNNING / FAILED)', () => {
    expect(mapEvaluationToFeedback(null, null, null)).toBeNull();
  });

  it('defaults missing alignments to an empty array', () => {
    const feedback = mapEvaluationToFeedback(
      { accuracy: 0.5, fluency: 0.5, completeness: 0.5 },
      0.5,
      null
    );
    expect(feedback?.wordAlignments).toEqual([]);
  });

  it('clamps out-of-range dimensions into [0, 1]', () => {
    const feedback = mapEvaluationToFeedback(
      { accuracy: 1.5, fluency: -0.2, completeness: 0.4 },
      2,
      null
    );
    expect(feedback?.accuracy).toBe(1);
    expect(feedback?.fluency).toBe(0);
    expect(feedback?.overall).toBe(1);
  });

  it('defaults overall to 0 and leaves optional fields null when score/blob fields are absent', () => {
    const feedback = mapEvaluationToFeedback(
      { accuracy: 0.7, fluency: 0.7, completeness: 0.7 },
      null,
      null
    );
    expect(feedback?.overall).toBe(0);
    expect(feedback?.transcript).toBeNull();
    expect(feedback?.wer).toBeNull();
  });
});

describe('getScoringJob (pool path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    session_id: 'job-1',
    upload_key: 'uploads/rec.opus',
    status: 'COMPLETED',
    score: 0.88,
    verdict: null,
    segments: [],
    evaluation,
    reference_audio_key: 'refs/1_1.mp3',
    created_at: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides
  });

  it('returns populated feedback mapped from scoring_jobs.evaluation, with status straight from the row', async () => {
    const { getDatabasePool } = await import('../../infra');
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [makeRow()] });
    vi.mocked(getDatabasePool).mockReturnValue({ query } as never);

    const result = await getScoringJob('job-1');

    expect(result).not.toBeNull();
    expect(result?.status).toBe('COMPLETED');
    expect(result?.score).toBe(0.88);
    expect(result?.feedback?.accuracy).toBe(0.9);
    expect(result?.feedback?.fluency).toBe(0.8);
    expect(result?.feedback?.completeness).toBe(0.95);
    expect(result?.feedback?.overall).toBe(0.88);
    expect(result?.feedback?.wordAlignments).toHaveLength(3);
    // MinIO mock returns null → presign falls back to the public base URL.
    expect(result?.feedback?.referenceAudioUrl).toBe('https://uploads.local/refs/1_1.mp3');
    expect(result?.recordingUrl).toBe('https://uploads.local/uploads/rec.opus');
  });

  it('regression: the query no longer joins the empty asr_results table', async () => {
    const { getDatabasePool } = await import('../../infra');
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [makeRow()] });
    vi.mocked(getDatabasePool).mockReturnValue({ query } as never);

    await getScoringJob('job-1');

    const sql = String(query.mock.calls[0][0]);
    expect(sql).not.toMatch(/asr_results/i);
  });

  it('yields null feedback for a job still running (no evaluation yet)', async () => {
    const { getDatabasePool } = await import('../../infra');
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [makeRow({ status: 'RUNNING', score: null, evaluation: null })]
    });
    vi.mocked(getDatabasePool).mockReturnValue({ query } as never);

    const result = await getScoringJob('job-1');

    expect(result?.status).toBe('RUNNING');
    expect(result?.feedback).toBeNull();
  });

  it('returns null when no row matches', async () => {
    const { getDatabasePool } = await import('../../infra');
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    vi.mocked(getDatabasePool).mockReturnValue({ query } as never);

    expect(await getScoringJob('missing')).toBeNull();
  });
});

describe('createScoringJob immediate response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches the backend create response with the full feedback breakdown', async () => {
    const { ensureReferenceAudio } = await import('../../infra');
    const { fetchWithTracing } = await import('../../infra/backendClient');
    vi.mocked(ensureReferenceAudio).mockResolvedValue({
      key: 'refs/1_1.mp3'
    } as never);
    vi.mocked(fetchWithTracing).mockResolvedValue({
      ok: true,
      json: async () => ({
        jobId: 'job-1',
        uploadKey: 'uploads/rec.opus',
        status: 'COMPLETED',
        score: 0.88,
        segments: [],
        evaluation,
        createdAt: '2026-06-01T00:00:00.000Z'
      })
    } as never);

    const result = await createScoringJob({
      sessionId: 'session-1',
      uploadKey: 'uploads/rec.opus',
      surahId: '1',
      ayahNumber: 1,
      userId: 'user-1'
    });

    expect(result.feedback?.accuracy).toBe(0.9);
    expect(result.feedback?.fluency).toBe(0.8);
    expect(result.feedback?.completeness).toBe(0.95);
    expect(result.feedback?.overall).toBe(0.88);
    expect(result.feedback?.wordAlignments).toHaveLength(3);
    expect(result.feedback?.referenceAudioUrl).toBe('https://uploads.local/refs/1_1.mp3');
    expect(result.recordingUrl).toBe('https://uploads.local/uploads/rec.opus');
  });
});

describe('scoring over gRPC', () => {
  const grpcJob = {
    jobId: 'job-1',
    uploadKey: 'uploads/rec.opus',
    status: 'COMPLETED',
    score: 0.88,
    segments: [],
    evaluation,
    createdAt: '2026-06-01T00:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the job through the gRPC client when it is configured', async () => {
    const { ensureReferenceAudio } = await import('../../infra');
    const { fetchWithTracing } = await import('../../infra/backendClient');
    const { getBackendGrpc } = await import('../../infra/backendGrpc');
    vi.mocked(ensureReferenceAudio).mockResolvedValue({ key: 'refs/1_1.mp3' } as never);
    const create = vi.fn().mockResolvedValue({ ...grpcJob });
    vi.mocked(getBackendGrpc).mockReturnValueOnce({ createScoringJob: create } as never);

    const result = await createScoringJob({
      sessionId: 'session-1',
      uploadKey: 'uploads/rec.opus',
      surahId: '1',
      ayahNumber: 1,
      userId: 'user-1'
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-1', referenceAudioKey: 'refs/1_1.mp3' })
    );
    expect(fetchWithTracing).not.toHaveBeenCalled();
    expect(result.feedback?.overall).toBe(0.88);
    expect(result.recordingUrl).toBe('https://uploads.local/uploads/rec.opus');
  });

  it('reads the job through the gRPC client when there is no database', async () => {
    const { getDatabasePool } = await import('../../infra');
    const { getBackendGrpc } = await import('../../infra/backendGrpc');
    vi.mocked(getDatabasePool).mockReturnValue(null);
    const get = vi
      .fn()
      .mockResolvedValueOnce({ ...grpcJob })
      .mockResolvedValueOnce(null);
    vi.mocked(getBackendGrpc).mockReturnValue({ getScoringJob: get } as never);

    const found = await getScoringJob('job-1');
    const missing = await getScoringJob('missing');

    expect(found?.feedback?.accuracy).toBe(0.9);
    expect(missing).toBeNull();
    vi.mocked(getBackendGrpc).mockReturnValue(null);
  });
});
