import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('trackUiEvent', () => {
  beforeEach(() => {
    startSpan.mockClear();
    setStatus.mockClear();
    endSpan.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('opens a span with the given name + attributes and ends it on the same tick', async () => {
    const { trackUiEvent } = await import('../use-ui-event');

    trackUiEvent('web.ui.recording_started', { surahId: '1', ayahNumber: 1 });

    expect(startSpan).toHaveBeenCalledWith(
      'web.ui.recording_started',
      expect.objectContaining({ attributes: { surahId: '1', ayahNumber: 1 } })
    );
    expect(setStatus).toHaveBeenCalledWith({ code: 1 }); // SpanStatusCode.OK = 1
    expect(endSpan).toHaveBeenCalledTimes(1);
  });

  it('treats missing attributes as an empty object', async () => {
    const { trackUiEvent } = await import('../use-ui-event');

    trackUiEvent('web.ui.loop_toggled');

    expect(startSpan).toHaveBeenCalledWith(
      'web.ui.loop_toggled',
      expect.objectContaining({ attributes: {} })
    );
    expect(endSpan).toHaveBeenCalled();
  });

  it('swallows exporter errors so a telemetry failure cannot break the surrounding UI handler', async () => {
    startSpan.mockImplementationOnce(() => {
      throw new Error('exporter offline');
    });
    const { trackUiEvent } = await import('../use-ui-event');

    expect(() => trackUiEvent('web.ui.suggested_clicked', { reason: 'fallback' })).not.toThrow();
  });

  it('is a no-op on the server (no window) so it never throws in RSC / SSR contexts', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - intentionally deleting for the SSR-shape test
    delete globalThis.window;
    try {
      const { trackUiEvent } = await import('../use-ui-event');
      trackUiEvent('web.ui.result_viewed');
      expect(startSpan).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
