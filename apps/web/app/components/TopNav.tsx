'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '../../i18n/navigation';
import { signOutAction } from '../actions';
import { clearLocalCache } from '../lib/storage';
import { BookIcon } from './icons/BookIcon';
import { css } from '../../styled-system/css';

type Tab = {
  href: string;
  labelKey: 'library' | 'practice' | 'history';
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { href: '/', labelKey: 'library', match: (p) => p === '/' || p.startsWith('/library') },
  {
    href: '/practice',
    labelKey: 'practice',
    match: (p) => p.startsWith('/practice')
  },
  { href: '/history', labelKey: 'history', match: (p) => p.startsWith('/history') }
];

type SessionView = {
  initial: string;
  label: string;
};

type Props = {
  session: SessionView | null;
};

// max-width:720px keeps the legacy CSS Module's @media breakpoint
// exactly. Panda's lg condition is min-width:720, so for the inverse
// we use a raw arbitrary media query rather than lgDown (which
// resolves to max-width:719.95px and shifts the boundary by ~1px).
const NAV_MOBILE_MQ = '@media (max-width: 720px)';

const navClass = css({
  backgroundColor: 'bg.nav',
  color: 'ink.onDark',
  paddingBlock: '4',
  paddingInline: '6',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: '6',
  // Phase 2.3-D: switch the keyboard focus ring to the cream tan accent
  // inside the dark top nav so it stays visible against #1f1a14.
  '& :focus-visible': { outlineColor: 'tan' },
  [NAV_MOBILE_MQ]: {
    gridTemplateColumns: '1fr auto',
    gridTemplateAreas: '"brand profile" "tabs tabs"',
    rowGap: '3'
  }
});

const brandClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3',
  textDecoration: 'none',
  color: '[inherit]',
  width: '[fit-content]',
  [NAV_MOBILE_MQ]: { gridArea: 'brand' }
});

const brandIconClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[36px]',
  height: '[36px]',
  borderRadius: '[8px]',
  backgroundColor: '[rgba(232, 217, 184, 0.06)]',
  color: 'tan'
});

const brandTextClass = css({
  display: 'flex',
  flexDirection: 'column',
  lineHeight: '[1]'
});

const brandTitleClass = css({
  fontFamily: 'serif',
  fontSize: '[22px]',
  fontWeight: 500,
  letterSpacing: '[0.01em]'
});

const brandSubtitleClass = css({
  marginTop: '[4px]',
  fontSize: '[11px]',
  letterSpacing: '[0.18em]',
  textTransform: 'uppercase',
  color: 'ink.onDarkMut'
});

const tabsClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8',
  justifyContent: 'center',
  [NAV_MOBILE_MQ]: {
    gridArea: 'tabs',
    justifyContent: 'flex-start',
    gap: '5'
  }
});

const tabClass = css({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '[44px]',
  fontSize: '[15px]',
  color: 'ink.onDarkMut',
  paddingBlock: '[6px]',
  paddingInline: '[2px]',
  transition: '[color 0.15s ease]',
  textDecoration: 'none',
  _hover: { color: 'ink.onDark' }
});

const tabActiveClass = css({
  color: 'ink.onDark',
  _after: {
    content: '""',
    position: 'absolute',
    left: '[0]',
    right: '[0]',
    bottom: '[-8px]',
    height: '[1px]',
    backgroundColor: 'ink.onDark'
  }
});

const profileClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '3',
  [NAV_MOBILE_MQ]: { gridArea: 'profile' }
});

const avatarClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[36px]',
  height: '[36px]',
  borderRadius: 'pill',
  backgroundColor: 'tan',
  color: 'ink.strong',
  fontWeight: 600,
  fontSize: '[14px]'
});

// .profileAction is its own button shape (32px tall, dark surface,
// tinted-cream border). Doesn't map to any button() variant — the
// existing button recipe's `nav` tone is the light-on-light version
// used by practice's .navBtn. Kept inline so the recipe stays focused.
const profileActionClass = css({
  font: 'inherit',
  fontSize: '[13px]',
  color: 'ink.onDark',
  backgroundColor: '[transparent]',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '[rgba(232, 217, 184, 0.4)]',
  borderRadius: 'pill',
  paddingBlock: '[6px]',
  paddingInline: '[14px]',
  cursor: 'pointer',
  textDecoration: 'none',
  minHeight: '[32px]',
  display: 'inline-flex',
  alignItems: 'center',
  transition: '[background 0.15s ease]',
  _hover: { backgroundColor: '[rgba(232, 217, 184, 0.08)]' },
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

export function TopNav({ session }: Props) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations('nav');

  const onSignOut = (): void => {
    startTransition(async () => {
      await signOutAction();
      clearLocalCache();
      router.replace('/');
      router.refresh();
    });
  };

  return (
    <nav className={navClass} aria-label={t('primaryNavAriaLabel')}>
      <Link href="/" className={brandClass}>
        <span className={brandIconClass} aria-hidden="true">
          <BookIcon size={22} />
        </span>
        <span className={brandTextClass}>
          <span className={brandTitleClass}>{t('brand.wordmark')}</span>
          <span className={brandSubtitleClass}>{t('brand.kicker')}</span>
        </span>
      </Link>

      <div className={tabsClass}>
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={active ? `${tabClass} ${tabActiveClass}` : tabClass}
              aria-current={active ? 'page' : undefined}
            >
              {t(`tab.${tab.labelKey}`)}
            </Link>
          );
        })}
      </div>

      <div className={profileClass}>
        {session ? (
          // Avatar links to `/profile` so the dropdown-style nav doubles
          // as the entry point to the account page; the inline "Sign out"
          // button stays on the nav so signed-in users still have a
          // one-click escape without first visiting /profile.
          <>
            <Link
              href="/profile"
              className={avatarClass}
              aria-label={t('signedInAs', { label: session.label })}
            >
              {session.initial}
            </Link>
            <button
              type="button"
              className={profileActionClass}
              onClick={onSignOut}
              disabled={pending}
            >
              {pending ? t('signingOut') : t('signOut')}
            </button>
          </>
        ) : (
          <Link href="/sign-in" className={profileActionClass}>
            {t('signIn')}
          </Link>
        )}
      </div>
    </nav>
  );
}
