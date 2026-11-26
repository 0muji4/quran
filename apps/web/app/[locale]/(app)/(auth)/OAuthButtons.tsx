'use client';

import { useTranslations } from 'next-intl';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { GoogleSignInButton } from './GoogleSignInButton';
import type { SignInWithGoogleResult } from '../../../actions';
import { css, cx } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

interface Props {
  onGoogleResult: (result: SignInWithGoogleResult) => void;
  onGoogleError: () => void;
}

const listClass = css({ display: 'flex', flexDirection: 'column', gap: '3' });

// Outlined, full width, in the text colour rather than the primary colour so
// the provider's mark leads.
const buttonClass = cx(
  appButton({ variant: 'outlined' }),
  css({ width: '[100%]', color: 'onSurface' })
);

// Google and Apple sign-in, full width under the email form. Google is live
// when a client ID is configured (otherwise it falls back to a disabled
// placeholder so dev without config still renders). Apple stays disabled —
// deferred per ADR 0010.
export function OAuthButtons({ onGoogleResult, onGoogleError }: Props) {
  const t = useTranslations('auth.social');
  const comingSoon = t('comingSoonSuffix');

  return (
    <div className={listClass}>
      {GOOGLE_CLIENT_ID ? (
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID}
          label={t('google')}
          className={buttonClass}
          onResult={onGoogleResult}
          onError={onGoogleError}
        />
      ) : (
        <button
          type="button"
          className={buttonClass}
          disabled
          aria-label={`${t('google')} ${comingSoon}`}
        >
          <GoogleIcon />
          <span>{t('google')}</span>
        </button>
      )}
      <button
        type="button"
        className={buttonClass}
        disabled
        aria-label={`${t('apple')} ${comingSoon}`}
      >
        <AppleIcon />
        <span>{t('apple')}</span>
      </button>
    </div>
  );
}
