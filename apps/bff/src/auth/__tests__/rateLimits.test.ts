import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  describe('on Render', () => {
    const render = process.env.RENDER;

    beforeEach(() => {
      process.env.RENDER = 'true';
    });

    afterEach(() => {
      if (render === undefined) delete process.env.RENDER;
      else process.env.RENDER = render;
    });

    it('keys on True-Client-IP, whatever X-Forwarded-For says', async () => {
      const app = appWith(signupLimiter);
      // Render's X-Forwarded-For: `<client-supplied...>, <client>, <cloudflare edge>, <render 10.x>`.
      const send = (client: string, i: number) =>
        request(app)
          .post('/target')
          .set('True-Client-IP', client)
          .set('X-Forwarded-For', `192.0.2.${i}, ${client}, 172.64.0.${i}, 10.0.0.${i}`);
      for (let i = 0; i < 5; i += 1) {
        expect((await send('203.0.113.7', i)).status).toBe(204);
      }

      expect((await send('203.0.113.7', 5)).status).toBe(429);
      expect((await send('198.51.100.9', 6)).status).toBe(204);
    });
  });

  it('ignores True-Client-IP off Render, where a client could set it', async () => {
    const app = appWith(signupLimiter);
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/target').set('True-Client-IP', `192.0.2.${i}`);
    }

    const response = await request(app).post('/target').set('True-Client-IP', '192.0.2.99');

    expect(response.status).toBe(429);
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
