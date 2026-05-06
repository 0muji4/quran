import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { createSignedUploadUrl } from '../../jobs';
import { expectZodPathError } from '../../__tests__/zodAssertions';

vi.mock('../../jobs', () => ({
  createSignedUploadUrl: vi.fn(),
  createScoringJob: vi.fn(),
  getScoringJob: vi.fn()
}));

describe('REST routes', () => {
  beforeEach(() => {
    process.env.MOCK_SESSION = 'true';
    process.env.NODE_ENV = 'test';
  });

  it('responds with health status', async () => {
    const app = createApp();
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a signed upload url', async () => {
    vi.mocked(createSignedUploadUrl).mockResolvedValue({
      sessionId: 'session-1',
      uploadKey: 'uploads/example',
      url: 'https://example.com/upload',
      fields: { key: 'uploads/example' },
      expiresAt: '2024-01-01T00:00:00.000Z'
    });

    const app = createApp();
    const response = await request(app).post('/signed-upload-url').send({
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sessionId: 'session-1',
      uploadKey: 'uploads/example',
      url: 'https://example.com/upload',
      fields: { key: 'uploads/example' },
      expiresAt: '2024-01-01T00:00:00.000Z'
    });
  });

  it('returns a server error when signed upload url creation fails', async () => {
    vi.mocked(createSignedUploadUrl).mockRejectedValue(new Error('upload url failure'));

    const app = createApp();
    const response = await request(app).post('/signed-upload-url').send({
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to create signed upload url' });
  });

  it('validates signed upload url payloads', async () => {
    const app = createApp();
    const response = await request(app).post('/signed-upload-url').send({});

    expect(response.status).toBe(400);
    expectZodPathError(response.body, ['body', 'filename']);
  });
});
