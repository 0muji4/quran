import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { trace, context as otelContext } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { logger } from '../logger';

describe('Logger', () => {
  let provider: NodeTracerProvider;
  let tracer: ReturnType<NodeTracerProvider['getTracer']>;

  beforeEach(() => {
    provider = new NodeTracerProvider();
    provider.register();
    tracer = provider.getTracer('test');
  });

  afterEach(async () => {
    await provider.shutdown();
  });

  it('should log basic messages without errors', () => {
    expect(() => {
      logger.info('test message');
    }).not.toThrow();
  });

  it('should log with trace context when span is active', () => {
    const span = tracer.startSpan('test-span');

    expect(() => {
      otelContext.with(trace.setSpan(otelContext.active(), span), () => {
        logger.info('test with trace');
      });
    }).not.toThrow();

    span.end();
  });

  it('should log without trace context when no span is active', () => {
    expect(() => {
      logger.info('test without trace');
    }).not.toThrow();
  });

  it('should include additional metadata without errors', () => {
    expect(() => {
      logger.info('test with metadata', { userId: '123', action: 'login' });
    }).not.toThrow();
  });
});
