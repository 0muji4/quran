import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Metric } from 'web-vitals';

// Capture each subscription so the test can fire a synthetic Metric
// through it. The mock has to be hoisted (vi.mock factory runs before
// imports), so the test reads back from these module-level holders.
// `vi.fn<(m: Metric) => void>()` is the single-type-arg form expected
// by vitest 2.x — the two-arg `vi.fn<Args, Return>` shape was removed.
const handlers = {
  lcp: vi.fn<(m: Metric) => void>(),
  fcp: vi.fn<(m: Metric) => void>(),
  inp: vi.fn<(m: Metric) => void>(),
  cls: vi.fn<(m: Metric) => void>(),
  ttfb: vi.fn<(m: Metric) => void>()
};

vi.mock('web-vitals', () => ({
  onLCP: (h: (m: Metric) => void) => {
    handlers.lcp.mockImplementation(h);
  },
  onFCP: (h: (m: Metric) => void) => {
    handlers.fcp.mockImplementation(h);
  },
  onINP: (h: (m: Metric) => void) => {
    handlers.inp.mockImplementation(h);
  },
  onCLS: (h: (m: Metric) => void) => {
    handlers.cls.mockImplementation(h);
  },
  onTTFB: (h: (m: Metric) => void) => {
    handlers.ttfb.mockImplementation(h);
  }
}));

const startSpan = vi.fn();
const setStatus = vi.fn();
const endSpan = vi.fn();

vi.mock('../web-tracer', () => ({
  getWebTracer: () => ({
    startSpan: (...args: unknown[]) => {
      startSpan(...args);
      return {
        setStatus: (...s: unknown[]) => setStatus(...s),
        end: () => endSpan()
      };
    }
  })
}));

const buildMetric = (overrides: Partial<Metric>): Metric =>
  ({
    name: 'LCP',
    value: 1234.5,
    delta: 1234.5,
    rating: 'good',
    id: 'v1-1',
    entries: [],
    navigationType: 'navigate',
    ...overrides
  }) as Metric;

describe('web-vitals telemetry', () => {
  beforeEach(async () => {
    startSpan.mockClear();
    setStatus.mockClear();
    endSpan.mockClear();
    Object.values(handlers).forEach((h) => h.mockReset());
    const mod = await import('../web-vitals');
    mod._resetForTesting();
    mod.initWebVitals();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it.each([
    { metric: 'LCP' as const, expected: 'web.vitals.lcp', handler: 'lcp' as const },
    { metric: 'FCP' as const, expected: 'web.vitals.fcp', handler: 'fcp' as const },
    { metric: 'INP' as const, expected: 'web.vitals.inp', handler: 'inp' as const },
    { metric: 'CLS' as const, expected: 'web.vitals.cls', handler: 'cls' as const },
    { metric: 'TTFB' as const, expected: 'web.vitals.ttfb', handler: 'ttfb' as const }
  ])('emits a $expected span when the $metric callback fires', ({ metric, expected, handler }) => {
    handlers[handler](buildMetric({ name: metric, value: 42, delta: 42, rating: 'good' }));

    expect(startSpan).toHaveBeenCalledWith(
      expected,
      expect.objectContaining({
        attributes: expect.objectContaining({
          'web.vitals.value': 42,
          'web.vitals.delta': 42,
          'web.vitals.rating': 'good',
          'web.vitals.navigation_type': 'navigate'
        })
      })
    );
    expect(setStatus).toHaveBeenCalledWith({ code: 1 });
    expect(endSpan).toHaveBeenCalledTimes(1);
  });

  it('preserves the rating bucket verbatim (good / needs-improvement / poor)', () => {
    handlers.cls(
      buildMetric({ name: 'CLS', value: 0.18, delta: 0.18, rating: 'needs-improvement' })
    );

    expect(startSpan).toHaveBeenCalledWith(
      'web.vitals.cls',
      expect.objectContaining({
        attributes: expect.objectContaining({ 'web.vitals.rating': 'needs-improvement' })
      })
    );
  });

  it('does not ship URL / referrer / element identifiers in span attributes', () => {
    handlers.lcp(buildMetric({ name: 'LCP', value: 2200 }));

    const call = startSpan.mock.calls[0];
    const attrs = (call?.[1] as { attributes: Record<string, unknown> }).attributes;
    const keys = Object.keys(attrs);

    // PII guarantee: only numeric value/delta, the enum rating, and the
    // navigation_type label. The `web-vitals/attribution` entry point
    // is deliberately not imported and would surface element targets.
    expect(keys.sort()).toEqual(
      [
        'web.vitals.delta',
        'web.vitals.navigation_type',
        'web.vitals.rating',
        'web.vitals.value'
      ].sort()
    );
  });

  it('swallows tracer errors so a telemetry failure cannot break the page', () => {
    startSpan.mockImplementationOnce(() => {
      throw new Error('exporter offline');
    });

    expect(() => handlers.lcp(buildMetric({ name: 'LCP', value: 1000 }))).not.toThrow();
  });

  it('initWebVitals is idempotent across repeat calls', async () => {
    const onLCPSpy = vi.fn();
    vi.doMock('web-vitals', () => ({
      onLCP: onLCPSpy,
      onFCP: vi.fn(),
      onINP: vi.fn(),
      onCLS: vi.fn(),
      onTTFB: vi.fn()
    }));
    vi.resetModules();
    const mod = await import('../web-vitals');
    mod._resetForTesting();

    mod.initWebVitals();
    mod.initWebVitals();
    mod.initWebVitals();

    expect(onLCPSpy).toHaveBeenCalledTimes(1);
  });
});
