import { defineRouting } from 'next-intl/routing';

// ADR 0023: locale-prefixed routing, explicit URLs (no Accept-Language sniffing).
// `en` is the default and the source of truth for messages; `ar` mirrors the
// English catalogue until the Phase 5 Arabic value pass.
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: false
});
