import type { Request, Response, NextFunction } from 'express';
import { context, propagation, trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { ATTR_HTTP_REQUEST_METHOD, ATTR_URL_FULL, ATTR_URL_PATH, ATTR_SERVER_ADDRESS, ATTR_URL_SCHEME, ATTR_USER_AGENT_ORIGINAL, ATTR_HTTP_ROUTE, ATTR_HTTP_RESPONSE_STATUS_CODE } from '@opentelemetry/semantic-conventions';
import { telemetry } from './telemetry';
import { logger } from './logger';

const tracer = telemetry.tracer;
const meter = telemetry.meter;

// Create metrics
const httpRequestDuration = meter.createHistogram('bff.http.request.duration', {
  description: 'Duration of HTTP requests in milliseconds',
  unit: 'ms'
});

const httpRequestsTotal = meter.createCounter('bff.http.requests.total', {
  description: 'Total number of HTTP requests'
});

/**
 * Express middleware for OpenTelemetry instrumentation
 * - Extracts trace context from incoming requests
 * - Creates spans for each request
 * - Records metrics
 * - Logs structured request information
 */
export const otelMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Extract trace context from incoming request headers
  const extractedContext = propagation.extract(context.active(), req.headers);

  // Start a new span within the extracted context
  const span = tracer.startSpan(
    `${req.method} ${req.route?.path || req.path}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        [ATTR_HTTP_REQUEST_METHOD]: req.method,
        [ATTR_URL_FULL]: req.url,
        [ATTR_URL_PATH]: req.path,
        [ATTR_SERVER_ADDRESS]: req.get('host') || '',
        [ATTR_URL_SCHEME]: req.protocol,
        [ATTR_USER_AGENT_ORIGINAL]: req.get('user-agent') || '',
        [ATTR_HTTP_ROUTE]: req.route?.path || req.path
      }
    },
    extractedContext
  );

  // Set the span as active in the current context
  const activeContext = trace.setSpan(extractedContext, span);

  // Override res.end to capture response information
  const originalEnd = res.end.bind(res);
  res.end = function (this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;

    // Set span attributes for response
    span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, res.statusCode);

    // Set span status based on HTTP status code
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Record metrics
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    };

    httpRequestDuration.record(duration, labels);
    httpRequestsTotal.add(1, labels);

    // Log request details within the active context
    context.with(activeContext, () => {
      logger.info('http request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration
      });
    });

    // End the span
    span.end();

    // Call original end function
    return originalEnd(...args);
  };

  // Run the next middleware
  next();
};
