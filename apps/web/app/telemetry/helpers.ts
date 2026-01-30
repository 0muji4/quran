import { context, propagation, SpanStatusCode } from '@opentelemetry/api';
import { tracer } from './telemetry';

export async function fetchWithTracing(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return tracer.startActiveSpan(
    `HTTP ${options?.method ?? 'GET'} ${url}`,
    async (span) => {
      try {
        // Inject trace context into HTTP headers
        const headers: Record<string, string> = {};
        propagation.inject(context.active(), headers);

        // Merge with existing headers
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...headers, // traceparent, tracestate
          },
        });

        // Set span attributes
        span.setAttribute('http.method', options?.method ?? 'GET');
        span.setAttribute('http.url', url);
        span.setAttribute('http.status_code', response.status);

        // Set span status
        if (!response.ok) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${response.status}`,
          });
          span.recordException(
            new Error(`HTTP ${response.status}: ${response.statusText}`)
          );
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        return response;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
