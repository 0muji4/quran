import type { routing } from './i18n/routing';
import type messages from './messages/en.json';

// Activates type-safe `t('key')` calls and narrows `useLocale()` to our locales.
// Messages start empty in Phase 1; keys land in Phase 2+.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
