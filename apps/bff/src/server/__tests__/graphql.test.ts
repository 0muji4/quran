import type { GraphQLSchema } from 'graphql';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { getGraphQLParameters, processRequest } from 'graphql-helix';

const mockSurahs = vi.hoisted(() => [
  {
    id: '1',
    nameAr: 'الفاتحة',
    nameEn: 'Al-Fatiha',
    revelationPlace: 'Meccan',
    ayahCount: 7,
    metadata: { hizb: 1 },
    ayahs: []
  },
  {
    id: '2',
    nameAr: 'البقرة',
    nameEn: 'Al-Baqarah',
    revelationPlace: 'Medinan',
    ayahCount: 286,
    metadata: { hizb: 2 },
    ayahs: []
  }
]);

vi.mock('../infra', () => ({
  fetchSurahsFromBackend: vi.fn().mockResolvedValue(mockSurahs),
  fetchSurahFromBackend: vi.fn(),
  fetchAyahFromBackend: vi.fn()
}));

let schema: GraphQLSchema;

beforeAll(async () => {
  ({ schema } = await import('../app'));
});

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

  it('returns surahs data from the resolver', async () => {
    const queryText =
      'query SurahList($limit: Int, $offset: Int) { surahs(limit: $limit, offset: $offset) { id nameEn nameAr ayahCount revelationPlace metadata } }';
    const request = {
      ...createRequest(queryText),
      body: {
        query: queryText,
        variables: { limit: 1, offset: 1 },
        operationName: 'SurahList'
      }
    };
    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      contextFactory: () => ({ session: null, requestId: 'test-request' })
    });

    const { fetchSurahsFromBackend } = await import('../infra');

    expect(fetchSurahsFromBackend).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('RESPONSE');
    if (result.type === 'RESPONSE') {
      expect(result.status).toBe(200);
      expect(result.payload).toEqual({
        data: {
          surahs: [
            {
              id: '2',
              nameEn: 'Al-Baqarah',
              nameAr: 'البقرة',
              ayahCount: 286,
              revelationPlace: 'Medinan',
              metadata: { hizb: 2 }
            }
          ]
        }
      });
    }
  });
});
