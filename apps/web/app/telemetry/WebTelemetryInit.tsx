'use client';

import { useEffect } from 'react';
import { initWebTelemetry } from './web-tracer';
import { initWebVitals } from './web-vitals';

// Mounted once at the top of the AppShell (via layout.tsx). The effect
// runs on the first client render and is idempotent — both init
// functions no-op after the first call. Rendering nothing keeps this
// component out of the DOM tree.
//
// Order matters: initWebTelemetry registers the WebTracerProvider that
// initWebVitals uses to emit its spans. If the OTel endpoint is unset
// both calls fall back to no-op behaviour (the global no-op tracer +
// an early-return guard) so dev / preview builds stay silent.
export function WebTelemetryInit(): null {
  useEffect(() => {
    initWebTelemetry();
    initWebVitals();
  }, []);
  return null;
}
