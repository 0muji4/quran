import { readFileSync } from 'fs';
import path from 'path';
import express, { type Response } from 'express';
import cors from 'cors';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createYoga } from 'graphql-yoga';
import { authMiddleware, authRouter, buildContext, type AuthedRequest } from '../auth';
import { graphqlHttpStatusPlugin } from '../graphql/httpStatus';
import { resolvers } from '../graphql';
import { meRouter } from '../me';
import { rscRouter, restRouter } from '../rest';
import { otelMiddleware } from '../telemetry';

// Navigate up from bff app to project root for schema file
// In dev: __dirname is apps/bff/dist/server (go up 4 levels)
// In test: __dirname is apps/bff/src/server (go up 4 levels)
// But process.cwd() might be apps/bff, so go up 2 from there
const projectRoot = process.cwd().endsWith('apps/bff')
  ? path.resolve(process.cwd(), '../..')
  : process.cwd();
const schemaPath = path.resolve(projectRoot, 'schemas/graphql/schema.graphql');
const typeDefs = readFileSync(schemaPath, 'utf8');

export const schema = makeExecutableSchema({ typeDefs, resolvers });

export const createApp = () => {
  const app = express();
  // Render's proxy appends the client address to X-Forwarded-For; trust only that hop.
  app.set('trust proxy', 1);

  // Apply OTEL middleware first to trace all requests
  app.use(otelMiddleware);

  app.use(
    cors({
      origin: process.env.WEB_URL || 'http://localhost:3000',
      credentials: true
    })
  );
  app.use(express.json());
  app.use(authMiddleware);

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(authRouter);
  app.use(restRouter);
  app.use(meRouter);
  const yoga = createYoga<{ req: AuthedRequest; res: Response }>({
    schema,
    context: ({ req }) => buildContext(req),
    // Express already applies CORS, and nothing here takes file uploads.
    cors: false,
    multipart: false,
    landingPage: false,
    plugins: [graphqlHttpStatusPlugin()]
  });
  app.use(yoga.graphqlEndpoint, (req: AuthedRequest, res) => {
    void yoga(req, res);
  });

  app.use('/rsc', rscRouter);

  return app;
};
