import { trace } from '@opentelemetry/api';
import winston from 'winston';

// winston's level names are lowercase (`info`, `warn`, `error`, …);
// supplying `INFO` silently disables every log line because winston
// matches the level string exactly. Normalise so the config is
// case-insensitive — `LOG_LEVEL=INFO` (the value we used to ship in
// `compose.dev.yml`) cost a multi-hour silent-failure debug session.
const logLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
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
      : winston.format.printf(({ timestamp, level, message, trace_id, span_id, ...meta }) => {
          let log = `${timestamp} [${level}] ${message}`;
          if (trace_id) log += ` trace_id=${trace_id}`;
          if (span_id) log += ` span_id=${span_id}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
  ),
  transports: [new winston.transports.Console()]
});
