import { readFileSync } from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL
} from 'graphql-helix';
import { authMiddleware, buildContext, type AuthedRequest } from '../auth';
import { resolvers } from '../graphql';
import { rscRouter, restRouter } from '../rest';

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

  app.use(restRouter);
  app.all('/graphql', async (req: AuthedRequest, res) => {
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query
    };

    if (shouldRenderGraphiQL(request)) {
      res.send(
        renderGraphiQL({
          endpoint: '/graphql'
        })
      );
      return;
    }

    const { operationName, query, variables } = getGraphQLParameters(request);
    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      contextFactory: () => buildContext(req)
    });

    if (result.type === 'RESPONSE') {
      result.headers.forEach(({ name, value }) => res.setHeader(name, value));
      res.status(result.status).json(result.payload);
    } else if (result.type === 'MULTIPART_RESPONSE') {
      res.writeHead(result.status ?? 200, {
        Connection: 'keep-alive',
        'Content-Type': 'multipart/mixed; boundary="-"',
        'Transfer-Encoding': 'chunked',
        ...Object.fromEntries(result.headers)
      });

      for await (const chunk of result.subscriptions) {
        const payload = `---\nContent-Type: application/json\n\n${JSON.stringify(chunk)}\n`;
        res.write(payload);
      }

      res.write('-----\n');
      res.end();
    } else {
      res.writeHead(result.status ?? 200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...Object.fromEntries(result.headers)
      });

      for await (const chunk of result.subscribe()) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    }
  });

  app.use('/rsc', rscRouter);

  return app;
};
