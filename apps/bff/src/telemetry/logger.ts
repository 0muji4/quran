import { trace } from '@opentelemetry/api';
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL ?? 'info';
const logFormat = process.env.LOG_FORMAT ?? 'json';

/**
 * Custom format that injects trace_id and span_id from OpenTelemetry context
 */
const traceContextFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    if (spanContext.traceId && spanContext.spanId) {
      info.trace_id = spanContext.traceId;
      info.span_id = spanContext.spanId;
    }
  }
  return info;
});

/**
 * Structured logger with automatic trace context injection
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    traceContextFormat(),
    logFormat === 'json'
      ? winston.format.json()
      : winston.format.printf(
          ({ timestamp, level, message, trace_id, span_id, ...meta }) => {
            let log = `${timestamp} [${level}] ${message}`;
            if (trace_id) log += ` trace_id=${trace_id}`;
            if (span_id) log += ` span_id=${span_id}`;
            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }
            return log;
          }
        )
  ),
  transports: [new winston.transports.Console()]
});
