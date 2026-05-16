import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware drop-in replacements for `next/link` and `next/navigation`.
// Always import navigation helpers from this module inside `app/[locale]/**`
// so internal hrefs/redirects stay locale-prefixed without the middleware 308 hop.
const nav = createNavigation(routing);

export const Link = nav.Link;
export const usePathname = nav.usePathname;
export const useRouter = nav.useRouter;
export const getPathname = nav.getPathname;

// `createNavigation`'s typed return loses the `=> never` annotation through TS
// inference, so destructured calls don't narrow control flow (e.g.
// `if (!x) redirect(...); return x.name;` still flags `x` as possibly undefined).
// Re-annotating the bound function fixes the narrowing without changing runtime.
export const redirect: (...args: Parameters<typeof nav.redirect>) => never = nav.redirect;
export const permanentRedirect: (...args: Parameters<typeof nav.permanentRedirect>) => never =
  nav.permanentRedirect;
