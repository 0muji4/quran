import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { otelMiddleware } from '../middleware';

describe('OTEL Middleware', () => {
  let app: Express;

  it('should handle basic requests', async () => {
    app = express();
    app.use(otelMiddleware);
    app.get('/test', (_req, res) => {
      res.json({ message: 'ok' });
    });

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'ok' });
  });

  it('should handle error responses correctly', async () => {
    app = express();
    app.use(otelMiddleware);
    app.get('/error', (_req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    const response = await request(app).get('/error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });

  it('should not interfere with normal request/response flow', async () => {
    app = express();
    app.use(otelMiddleware);
    app.use(express.json());
    app.post('/data', (req, res) => {
      res.json({ received: req.body });
    });

    const response = await request(app).post('/data').send({ test: 'data' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: { test: 'data' } });
  });
});
