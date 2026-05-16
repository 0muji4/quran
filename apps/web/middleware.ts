import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip Next internals (`_next`, `_vercel`), route handlers (`api`, `healthz`),
  // and any path with a file extension (icons, sourcemaps, etc.).
  matcher: ['/((?!api|_next|_vercel|healthz|.*\\..*).*)']
};
