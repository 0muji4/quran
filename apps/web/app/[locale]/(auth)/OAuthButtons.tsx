'use client';

import { useTranslations } from 'next-intl';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { css } from '../../../styled-system/css';

type Props = {
  // 'full' → "Continue with Google" (sign-up, primary placement);
  // 'compact' → "Google" (sign-in, below the email path).
  variant: 'compact' | 'full';
};

const rowClass = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '3',
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' }
});

const buttonClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2',
  font: '[inherit]',
  fontSize: '[14px]',
  fontWeight: 600,
  minHeight: '[44px]',
  padding: '3',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  color: 'ink.default',
  cursor: 'pointer',
  _disabled: { opacity: 0.55, cursor: 'not-allowed' }
});

// Google / Apple sign-in buttons. Rendered to match the design but
// disabled — federated auth is deferred per ADR 0010 (no OAuth client
// config yet). The aria-label spells out why they are inert.
// Client component because AuthForm (`'use client'`) instantiates it
// directly; the only state we touch here is translation lookup.
export function OAuthButtons({ variant }: Props) {
  const t = useTranslations('auth.social');
  const googleLabel = t(variant === 'full' ? 'googleFull' : 'googleShort');
  const appleLabel = t(variant === 'full' ? 'appleFull' : 'appleShort');
  const comingSoon = t('comingSoonSuffix');

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={buttonClass}
        disabled
        aria-label={`${googleLabel} ${comingSoon}`}
      >
        <GoogleIcon />
        <span>{googleLabel}</span>
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled
        aria-label={`${appleLabel} ${comingSoon}`}
      >
        <AppleIcon />
        <span>{appleLabel}</span>
      </button>
    </div>
  );
}
