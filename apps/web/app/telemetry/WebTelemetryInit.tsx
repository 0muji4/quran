'use client';

import { useEffect } from 'react';
import { initWebTelemetry } from './web-tracer';

// Mounted once at the top of the AppShell (via layout.tsx). The effect
// runs on the first client render and is idempotent — initWebTelemetry
// no-ops after the first call. Rendering nothing keeps this component
// out of the DOM tree.
export function WebTelemetryInit(): null {
  useEffect(() => {
    initWebTelemetry();
  }, []);
  return null;
}
