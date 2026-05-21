'use client';

import { useEffect } from 'react';
import { trackUiEvent } from '../../../../telemetry/use-ui-event';

// Phase 4.4 (ADR 0016). Server-rendered ResultDetail can't call
// trackUiEvent directly because the helper is a 'use client' module;
// this tiny mounted-once tracker fires `web.ui.result_viewed` from a
// client effect. Returns null so the DOM stays unchanged.

interface Props {
  surahId: string;
  ayahNumber: number;
  score: number | null;
}

export function ResultViewedTracker({ surahId, ayahNumber, score }: Props): null {
  useEffect(() => {
    trackUiEvent('web.ui.result_viewed', {
      surahId,
      ayahNumber,
      score: score ?? -1
    });
  }, [surahId, ayahNumber, score]);
  return null;
}
