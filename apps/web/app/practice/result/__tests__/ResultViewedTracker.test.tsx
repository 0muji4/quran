import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const { trackUiEvent } = vi.hoisted(() => ({ trackUiEvent: vi.fn() }));

vi.mock('../../../telemetry/use-ui-event', () => ({
  trackUiEvent
}));

import { ResultViewedTracker } from '../ResultViewedTracker';

describe('ResultViewedTracker', () => {
  beforeEach(() => {
    trackUiEvent.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('fires web.ui.result_viewed once on mount with surah/ayah/score attrs', () => {
    render(<ResultViewedTracker surahId="1" ayahNumber={3} score={86} />);
    expect(trackUiEvent).toHaveBeenCalledWith('web.ui.result_viewed', {
      surahId: '1',
      ayahNumber: 3,
      score: 86
    });
    expect(trackUiEvent).toHaveBeenCalledTimes(1);
  });

  it('substitutes -1 for a null score so the attribute stays present', () => {
    render(<ResultViewedTracker surahId="2" ayahNumber={255} score={null} />);
    expect(trackUiEvent).toHaveBeenCalledWith(
      'web.ui.result_viewed',
      expect.objectContaining({ score: -1 })
    );
  });
});
