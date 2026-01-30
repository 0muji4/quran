import winston from 'winston';
import { trace } from '@opentelemetry/api';

// Custom format to inject trace context
const traceContextFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    traceContextFormat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
