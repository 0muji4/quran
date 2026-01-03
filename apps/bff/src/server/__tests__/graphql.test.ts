import { describe, expect, it } from 'vitest';
import { getGraphQLParameters, processRequest } from 'graphql-helix';
import { schema } from '../app';

const createRequest = (query: string) => ({
  body: { query },
  headers: {},
  method: 'POST',
  query: {}
});

describe('GraphQL helix integration', () => {
  it('processes a basic GraphQL request', async () => {
    const request = createRequest('{ __typename }');
    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      contextFactory: () => ({ session: null, requestId: 'test-request' })
    });

    expect(result.type).toBe('RESPONSE');
    if (result.type === 'RESPONSE') {
      expect(result.status).toBe(200);
      expect(result.payload).toEqual({ data: { __typename: 'Query' } });
    }
  });
});
