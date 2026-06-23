'use client';

import { useTranslations } from 'next-intl';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { GoogleSignInButton } from './GoogleSignInButton';
import type { SignInWithGoogleResult } from '../../actions';
import { css } from '../../../styled-system/css';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

interface Props {
  // 'full' → "Continue with Google" (sign-up, primary placement);
  // 'compact' → "Google" (sign-in, below the email path).
  variant: 'compact' | 'full';
  onGoogleResult: (result: SignInWithGoogleResult) => void;
  onGoogleError: () => void;
}

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

// Google / Apple sign-in buttons. Google is live when a client ID is
// configured (otherwise it falls back to the disabled placeholder so dev
// without config still renders). Apple stays disabled — deferred per ADR
// 0010.
export function OAuthButtons({ variant, onGoogleResult, onGoogleError }: Props) {
  const t = useTranslations('auth.social');
  const googleLabel = t(variant === 'full' ? 'googleFull' : 'googleShort');
  const appleLabel = t(variant === 'full' ? 'appleFull' : 'appleShort');
  const comingSoon = t('comingSoonSuffix');

  return (
    <div className={rowClass}>
      {GOOGLE_CLIENT_ID ? (
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID}
          label={googleLabel}
          onResult={onGoogleResult}
          onError={onGoogleError}
        />
      ) : (
        <button
          type="button"
          className={buttonClass}
          disabled
          aria-label={`${googleLabel} ${comingSoon}`}
        >
          <GoogleIcon />
          <span>{googleLabel}</span>
        </button>
      )}
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
