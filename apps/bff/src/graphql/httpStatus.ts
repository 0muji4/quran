import type { ExecutionResult } from 'graphql';
import type { Plugin } from 'graphql-yoga';

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  RATE_LIMITED: 429
};

const statusFor = ({ errors, ...result }: ExecutionResult): number | undefined => {
  if (!errors?.length) return undefined;
  for (const error of errors) {
    const mapped = STATUS_BY_ERROR_CODE[String(error.extensions?.code)];
    if (mapped) return mapped;
  }
  // No data key means the request never executed: a parse or validation error.
  return 'data' in result ? undefined : 400;
};

/**
 * Sets the HTTP status from the GraphQL result. Mobile clients refresh their
 * access token only on HTTP 401, so authentication errors cannot stay at 200.
 */
export const graphqlHttpStatusPlugin = (): Plugin => ({
  onResultProcess({ result, setResult }) {
    if (Array.isArray(result) || Symbol.asyncIterator in result) return;
    const status = statusFor(result);
    if (status) setResult({ ...result, extensions: { ...result.extensions, http: { status } } });
  }
});
