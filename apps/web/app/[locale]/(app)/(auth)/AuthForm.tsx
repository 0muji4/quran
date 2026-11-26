'use client';

import type { FormEvent } from 'react';
import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '../../../../i18n/navigation';
import { signInAction, signUpAction, type SignInWithGoogleResult } from '../../../actions';
import { clearLocalCache, refreshAllFromBff } from '../../../lib/storage';
import type { AuthMode } from './copy';
import { Divider } from './Divider';
import { LevelSelector } from './LevelSelector';
import { OAuthButtons } from './OAuthButtons';
import { PasswordField } from './PasswordField';
import { TextField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css, cx } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

interface Props {
  mode: AuthMode;
  redirectTo?: string;
}

const formClass = css({ display: 'flex', flexDirection: 'column', gap: '5' });

const termsClass = css({ display: 'flex', flexDirection: 'column', gap: '1' });

const termsRowClass = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '3',
  paddingBlock: '1',
  textStyle: 'bodyMedium',
  color: 'onSurface',
  cursor: 'pointer',
  '& a': { color: 'primary' }
});

const checkboxClass = css({
  // The browser draws the control; it follows the system colour scheme.
  colorScheme: 'light dark',
  flexShrink: 0,
  width: '[18px]',
  height: '[18px]',
  margin: '[3px]',
  accentColor: 'primary',
  _focusVisible: {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]'
  }
});

// Under the terms, lined up with their text after the 24px checkbox and gap.
const termsErrorClass = css({
  margin: '0',
  paddingInlineStart: '[36px]',
  textStyle: 'bodySmall',
  color: 'error'
});

// Password reset is deferred per ADR 0010, so — like the apps and the Apple
// button — Forgot password? shows disabled rather than linking to a route
// that does not exist yet.
const forgotRowClass = css({ display: 'flex', justifyContent: 'flex-end', marginTop: '[-12px]' });

const forgotClass = cx(appButton({ variant: 'text' }), css({ marginInlineEnd: '[-12px]' }));

const submitClass = cx(appButton({ variant: 'filled' }), css({ width: '[100%]' }));

// A Material 3 circular progress indicator.
const spinnerClass = css({
  flexShrink: 0,
  animation: '[appSpin 1s linear infinite]',
  _motionReduce: { animation: 'none' }
});

const footerClass = css({
  margin: '0',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: '1',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant'
});

// The interactive island of the auth screen. AuthScreen renders the title and
// lede around this; here we own the form fields, the sign-up terms gate, the
// sign-in providers, and the BFF auth flow (server action → cache migration →
// redirect).
export function AuthForm({ mode, redirectTo = '/' }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('auth');
  const modeT = useTranslations(`auth.${mode}`);

  // Shared post-auth step for both the password and Google paths: drop
  // any pre-auth anonymous cache, pull the authenticated view, then
  // redirect (with the ADR-0024 §4 welcome-back flag when reactivated).
  const completeAuth = async (reactivated: boolean): Promise<void> => {
    clearLocalCache();
    await refreshAllFromBff();
    const unlocalized = redirectTo.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
    const destination = reactivated
      ? `${unlocalized}${unlocalized.includes('?') ? '&' : '?'}welcome-back=1`
      : unlocalized;
    router.replace(destination);
    router.refresh();
  };

  const onGoogleResult = (result: SignInWithGoogleResult): void => {
    if (result.ok) {
      setError(null);
      startTransition(async () => {
        try {
          await completeAuth(result.reactivated);
        } catch {
          setError(t('error.unknown'));
        }
      });
      return;
    }
    const key =
      result.error === 'link_required'
        ? 'google_link_required'
        : result.error === 'unavailable'
          ? 'google_unavailable'
          : 'invalid_credentials';
    setError(t(`error.${key}`));
  };

  const onGoogleError = (): void => setError(t('error.unknown'));

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const displayName = String(data.get('displayName') ?? '').trim();
    // LevelSelector posts its value through `name="level"` on the radio
    // group. The first option is `defaultChecked`, so the field is
    // always present on a sign-up submit. The signed-in user record
    // gets the value back from the BFF for the profile badge.
    const levelRaw = String(data.get('level') ?? '');
    const level: 'beginner' | 'intermediate' | 'advanced' | undefined =
      levelRaw === 'beginner' || levelRaw === 'intermediate' || levelRaw === 'advanced'
        ? levelRaw
        : undefined;

    // Client-side password-length guard mirroring the BFF zod schema
    // (`password.min(8)` on sign-up; sign-in stays unconstrained so users
    // who created an account before this rule existed can still get in).
    // The helper text already advertises 8+ characters; failing here saves
    // a server round-trip and lets a11y users hear the same error banner.
    if (mode === 'signup' && password.length < 8) {
      setError(t('password.tooShort'));
      return;
    }

    // Sign-up terms gate: block submission and move focus to the checkbox
    // so the requirement is announced rather than silently failing.
    if (mode === 'signup' && !agreedToTerms) {
      setTermsError(t('terms.error'));
      termsRef.current?.focus();
      return;
    }
    setTermsError(null);

    startTransition(async () => {
      try {
        let reactivated = false;
        if (mode === 'signup') {
          const result = await signUpAction({
            email,
            password,
            displayName: displayName ? displayName : undefined,
            level
          });
          if (!result.ok) {
            setError(t(`error.${result.error}`));
            return;
          }
        } else {
          const result = await signInAction({ email, password });
          if (!result.ok) {
            setError(t(`error.${result.error}`));
            return;
          }
          reactivated = result.reactivated;
        }
        await completeAuth(reactivated);
      } catch {
        // Reached only on genuine system failures; business errors are
        // surfaced via the `{ ok: false }` branches above.
        setError(t('error.unknown'));
      }
    });
  };

  return (
    <>
      <form className={formClass} onSubmit={onSubmit} noValidate>
        {mode === 'signup' && (
          <TextField
            id="auth-display-name"
            label={t('field.name')}
            helper={t('field.nameHelper')}
            type="text"
            name="displayName"
            autoComplete="name"
            maxLength={64}
            disabled={pending}
          />
        )}

        <TextField
          id="auth-email"
          label={t('field.email')}
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={pending}
        />

        <PasswordField
          id="auth-password"
          name="password"
          label={t('field.password')}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          disabled={pending}
          helperText={mode === 'signup' ? t('password.helper') : undefined}
        />

        {mode === 'signin' && (
          <div className={forgotRowClass}>
            <button type="button" className={forgotClass} disabled title="Coming soon">
              {t('forgotPassword')}
            </button>
          </div>
        )}

        {mode === 'signup' && <LevelSelector disabled={pending} />}

        {mode === 'signup' && (
          <div className={termsClass}>
            <label className={termsRowClass}>
              <input
                ref={termsRef}
                id="auth-terms"
                type="checkbox"
                className={checkboxClass}
                checked={agreedToTerms}
                onChange={(event) => {
                  setAgreedToTerms(event.target.checked);
                  if (event.target.checked) {
                    setTermsError(null);
                  }
                }}
                disabled={pending}
                aria-invalid={termsError ? true : undefined}
                aria-describedby={termsError ? 'auth-terms-error' : undefined}
              />
              <span>
                {t.rich('terms.label', {
                  tosLink: (chunks) => <a href="/terms">{chunks}</a>,
                  privacyLink: (chunks) => <a href="/privacy">{chunks}</a>
                })}
              </span>
            </label>
            {termsError && (
              <p id="auth-terms-error" className={termsErrorClass} role="alert">
                {termsError}
              </p>
            )}
          </div>
        )}

        {error && <ErrorPanel>{error}</ErrorPanel>}

        <button className={submitClass} type="submit" disabled={pending}>
          {pending && (
            <svg
              className={spinnerClass}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" strokeDasharray="18 60" />
            </svg>
          )}
          {pending ? modeT('submitPending') : modeT('submit')}
        </button>
      </form>

      <Divider label={t('divider.or')} />
      <OAuthButtons onGoogleResult={onGoogleResult} onGoogleError={onGoogleError} />

      <p className={footerClass}>
        {modeT('footerPrompt')}
        <Link
          className={appButton({ variant: 'text' })}
          href={mode === 'signin' ? '/sign-up' : '/sign-in'}
        >
          {modeT('footerAction')}
        </Link>
      </p>
    </>
  );
}
