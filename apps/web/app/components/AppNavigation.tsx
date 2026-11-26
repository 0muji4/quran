'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '../../i18n/navigation';
import { getLastPracticed } from '../lib/storage';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { css } from '../../styled-system/css';

type Destination = 'library' | 'practice' | 'history' | 'profile';

interface Item {
  key: Destination;
  href: string;
  match: (pathname: string) => boolean;
}

// Al-Fatihah 1:1 is the Practice destination until an ayah has been
// practised, as in the apps. Returning users get the last-practised ayah once
// local storage is read.
const DEFAULT_PRACTICE_HREF = '/practice/1/1';

const ITEMS: Item[] = [
  { key: 'library', href: '/', match: (p) => p === '/' || p.startsWith('/library') },
  { key: 'practice', href: DEFAULT_PRACTICE_HREF, match: (p) => p.startsWith('/practice') },
  { key: 'history', href: '/history', match: (p) => p.startsWith('/history') },
  // Signed out, Profile leads to sign-in, so the sign-in and sign-up pages
  // belong to it.
  {
    key: 'profile',
    href: '/profile',
    match: (p) => p.startsWith('/profile') || p === '/sign-in' || p === '/sign-up'
  }
];

// A Material 3 navigation bar below the medium window size class (600px), and
// a navigation rail from there up (ADR 0032). Both sit in the page flow rather
// than being fixed: the bar sticks to the bottom of the window after the page
// content, and the rail runs the page's full height with its destinations
// sticking to the top. A full-page capture then draws them where they belong.
const navClass = css({
  position: 'sticky',
  bottom: '0',
  zIndex: 10,
  order: 1,
  background: 'surfaceContainer',
  paddingBottom: '[env(safe-area-inset-bottom)]',
  medium: {
    position: 'static',
    order: 0,
    flexShrink: 0,
    width: '[80px]',
    paddingBottom: '0',
    background: 'surface'
  }
});

const destinationsClass = css({
  display: 'flex',
  height: '[80px]',
  medium: {
    position: 'sticky',
    top: '0',
    height: 'auto',
    paddingTop: '[44px]',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3'
  }
});

const itemClass = css({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1',
  color: 'onSurfaceVariant',
  textStyle: 'labelMedium',
  textDecoration: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&[aria-current=page]': { color: 'onSurface' },
  _focusVisible: { outline: 'none' },
  medium: { flex: 'none', width: '[80px]' }
});

const indicatorClass = css({
  position: 'relative',
  isolation: 'isolate',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[64px]',
  height: '[32px]',
  borderRadius: 'full',
  _before: {
    content: '""',
    position: 'absolute',
    inset: '0',
    borderRadius: 'inherit',
    background: 'currentColor',
    opacity: 0,
    zIndex: -1,
    transition: '[opacity 0.15s ease]'
  },
  'a:hover > &': { _before: { opacity: 0.08 } },
  'a:focus-visible > &': {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]'
  },
  'a[aria-current=page] > &': {
    background: 'secondaryContainer',
    color: 'onSecondaryContainer'
  },
  medium: { width: '[56px]' }
});

export function AppNavigation() {
  const pathname = usePathname() ?? '/';
  const t = useTranslations('nav');
  const [lastPracticed] = useLocalStorageState(getLastPracticed, null);
  const practiceHref = lastPracticed
    ? `/practice/${lastPracticed.surahId}/${lastPracticed.ayahNumber}`
    : DEFAULT_PRACTICE_HREF;

  return (
    <nav className={navClass} aria-label={t('primaryNavAriaLabel')}>
      <div className={destinationsClass}>
        {ITEMS.map((item) => {
          const current = item.match(pathname);
          return (
            <Link
              key={item.key}
              href={item.key === 'practice' ? practiceHref : item.href}
              className={itemClass}
              aria-current={current ? 'page' : undefined}
            >
              <span className={indicatorClass}>
                <DestinationIcon destination={item.key} />
              </span>
              {t(`tab.${item.key}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DestinationIcon({ destination }: { destination: Destination }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {destination === 'library' && (
        <>
          <path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" />
          <path d="M8 7h7" />
        </>
      )}
      {destination === 'practice' && (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </>
      )}
      {destination === 'history' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {destination === 'profile' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
    </svg>
  );
}
