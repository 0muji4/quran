import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const mockSurahs = [
  {
    id: '1',
    nameAr: 'الفاتحة',
    nameEn: 'Al-Fatiha',
    revelationPlace: 'Meccan',
    ayahCount: 7,
    ayahs: []
  },
  {
    id: '2',
    nameAr: 'البقرة',
    nameEn: 'Al-Baqarah',
    revelationPlace: 'Medinan',
    ayahCount: 286,
    ayahs: []
  }
];

const fetchSurahsFromBackend = vi.fn();

vi.mock('../../infra/backendClient', () => ({
  fetchSurahsFromBackend,
  fetchSurahFromBackend: vi.fn(),
  fetchAyahFromBackend: vi.fn()
}));

vi.mock('../../infra/backendGrpc', () => ({
  getBackendGrpc: vi.fn(() => null)
}));

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../app');
  app = createApp();
});

const post = (body: object) => request(app).post('/graphql').send(body);

// Every client depends on this contract. Android and iOS refresh tokens only
// on HTTP 401, so these tests pin status codes and error shapes over HTTP.
describe('POST /graphql', () => {
  it('returns data with 200', async () => {
    const res = await post({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toEqual({ data: { __typename: 'Query' } });
  });

  it('passes variables and operationName', async () => {
    const res = await post({
      query: 'query A { __typename } query B($s: Boolean!) { __typename @skip(if: $s) }',
      operationName: 'B',
      variables: { s: true }
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: {} });
  });

  it('answers an unauthenticated field with 401 and the error code', async () => {
    const res = await post({ query: '{ scoringJob(jobId: "job-1") { jobId } }' });

    expect(res.status).toBe(401);
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(res.body.errors[0].message).toBe('authentication required');
    expect(res.body.extensions).toBeUndefined();
  });

  it.each([
    [
      'createScoringJob',
      'mutation { createScoringJob(input: { uploadKey: "k", surahId: "1" }) { jobId } }'
    ],
    [
      'getSignedUploadUrl',
      'mutation { getSignedUploadUrl(input: { filename: "a.webm", contentType: "audio/webm" }) { url } }'
    ],
    ['scoringJob', '{ scoringJob(jobId: "job-1") { jobId } }']
  ])('rejects %s without a session', async (_name, query) => {
    const res = await post({ query });

    expect(res.status).toBe(401);
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('returns surahs from the resolver', async () => {
    fetchSurahsFromBackend.mockResolvedValueOnce(mockSurahs);

    const res = await post({
      query:
        'query SurahList($limit: Int, $offset: Int) { surahs(limit: $limit, offset: $offset) { id nameEn } }',
      operationName: 'SurahList',
      variables: { limit: 1, offset: 1 }
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { surahs: [{ id: '2', nameEn: 'Al-Baqarah' }] } });
  });

  it.each([
    ['json', 'application/json'],
    ['apollo', 'application/graphql-response+json, application/json;q=0.9']
  ])('reports a resolver failure with 200 for %s clients', async (_name, accept) => {
    fetchSurahsFromBackend.mockRejectedValueOnce(new Error('internal detail'));

    const res = await post({ query: '{ surahs { id } }' }).set('Accept', accept);

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe('Unexpected error.');
    expect(JSON.stringify(res.body)).not.toContain('internal detail');
  });

  it('rejects a syntax error with 400', async () => {
    const res = await post({ query: '{' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toContain('Syntax Error');
  });

  it('rejects an unknown field with 400', async () => {
    const res = await post({ query: '{ nope }' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toContain('Cannot query field');
  });

  it('rejects a request with no query with 400', async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(1);
  });
});
