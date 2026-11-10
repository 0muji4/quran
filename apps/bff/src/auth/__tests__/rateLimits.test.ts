import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TRUSTED_PROXY_HOPS } from '../../server/proxy';
import { loginAccountLimiter, signupLimiter } from '../rateLimits';

const appWith = (limiter: express.RequestHandler) => {
  const app = express();
  app.use(express.json());
  app.post('/target', limiter, (_req, res) => {
    res.status(204).end();
  });
  return app;
};

describe('auth rate limits', () => {
  const nodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('rejects a sixth sign-up from one address within the hour', async () => {
    const app = appWith(signupLimiter);
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/target')).status).toBe(204);
    }

    const response = await request(app).post('/target');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'too many requests' });
  });

  it('keys on the client address behind Cloudflare and Render, ignoring spoofed entries', async () => {
    const app = appWith(signupLimiter);
    app.set('trust proxy', TRUSTED_PROXY_HOPS);
    // Render delivers `<client-supplied...>, <client>, <cloudflare edge>`; the
    // spoofed first entry and the edge address change on every request.
    const forwardedFor = (client: string, i: number) => `10.0.0.${i}, ${client}, 172.64.0.${i}`;
    for (let i = 0; i < 5; i += 1) {
      const response = await request(app)
        .post('/target')
        .set('X-Forwarded-For', forwardedFor('203.0.113.7', i));
      expect(response.status).toBe(204);
    }

    const sameClient = await request(app)
      .post('/target')
      .set('X-Forwarded-For', forwardedFor('203.0.113.7', 5));
    const otherClient = await request(app)
      .post('/target')
      .set('X-Forwarded-For', forwardedFor('198.51.100.9', 6));

    expect(sameClient.status).toBe(429);
    expect(otherClient.status).toBe(204);
  });

  it('counts sign-in attempts per account regardless of letter case', async () => {
    const app = appWith(loginAccountLimiter);
    for (let i = 0; i < 10; i += 1) {
      await request(app).post('/target').send({ email: 'User@Example.com' });
    }

    const sameAccount = await request(app).post('/target').send({ email: 'user@example.com' });
    const otherAccount = await request(app).post('/target').send({ email: 'other@example.com' });

    expect(sameAccount.status).toBe(429);
    expect(otherAccount.status).toBe(204);
  });

  it('does not limit outside production', async () => {
    process.env.NODE_ENV = 'test';
    const app = appWith(signupLimiter);

    const response = await request(app).post('/target');

    expect(response.status).toBe(204);
  });
});
