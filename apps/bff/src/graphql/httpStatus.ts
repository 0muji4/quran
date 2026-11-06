const STATUS_BY_ERROR_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  RATE_LIMITED: 429
};

interface GraphQLPayload {
  errors?: readonly { extensions?: { code?: unknown } }[];
}

/**
 * HTTP status for a GraphQL response. Mobile clients refresh their access token
 * only on HTTP 401, so authentication errors cannot stay at 200.
 */
export const graphqlHttpStatus = (status: number, payload: unknown): number => {
  const errors = (payload as GraphQLPayload | null)?.errors ?? [];
  for (const error of errors) {
    const mapped = STATUS_BY_ERROR_CODE[String(error.extensions?.code)];
    if (mapped) return mapped;
  }
  return status;
};
