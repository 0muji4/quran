'use client';

import { FormEvent, useRef, useState, useTransition } from 'react';
import { Link, useRouter } from '../../../i18n/navigation';
import { signInAction, signUpAction } from '../../actions';
import { clearLocalCache, refreshAllFromBff } from '../../lib/storage';
import { AUTH_COPY, type AuthMode } from './copy';
import { Divider } from './Divider';
import { LevelSelector } from './LevelSelector';
import { OAuthButtons } from './OAuthButtons';
import { PasswordField } from './PasswordField';
import { css } from '../../../styled-system/css';

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

const formClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  marginTop: '6'
});

const errorClass = css({
  backgroundColor: '[rgba(192, 57, 43, 0.08)]',
  color: 'red',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '[rgba(192, 57, 43, 0.25)]',
  borderRadius: 'md',
  paddingBlock: '3',
  paddingInline: '4',
  fontSize: '[13px]'
});

const fieldClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2'
});

const labelClass = css({
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'ink.default'
});

const inputClass = css({
  width: '[100%]',
  font: '[inherit]',
  fontSize: '[15px]',
  paddingBlock: '3',
  paddingInline: '4',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  minHeight: '[44px]',
  '&:focus-visible': { outlineColor: 'teal' }
});

const termsRowClass = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '2'
});

const termsCheckboxClass = css({
  width: '[16px]',
  height: '[16px]',
  marginTop: '[2px]',
  accentColor: 'teal'
});

const termsLabelClass = css({
  fontSize: '[13px]',
  lineHeight: '[1.5]',
  color: 'ink.default',
  cursor: 'pointer',
  '& a': {
    color: 'teal.deep',
    textDecoration: 'underline'
  }
});

const termsErrorClass = css({
  marginTop: '[calc(var(--spacing-1) * -1)]',
  fontSize: '[12px]',
  color: 'red'
});

// .submit doesn't quite match button(tone:'teal') — legacy submit uses
// 12/20 padding, 15px font, 48px min-height, and tan-soft (not bg.paper)
// text. Keep inline so the auth CTA preserves its slightly larger
// silhouette and the cream-on-teal pairing the brand design asked for.
const submitClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2',
  font: '[inherit]',
  fontSize: '[15px]',
  fontWeight: 600,
  paddingBlock: '3',
  paddingInline: '5',
  backgroundColor: 'teal',
  color: 'tan.soft',
  borderWidth: '[0]',
  borderRadius: 'pill',
  minHeight: '[48px]',
  cursor: 'pointer',
  transition: '[background 0.15s ease]',
  '&:hover:not(:disabled)': { backgroundColor: 'teal.deep' },
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

const footerClass = css({
  marginTop: '6',
  fontSize: '[13px]',
  color: 'ink.muted',
  textAlign: 'center',
  '& a': {
    color: 'teal.deep',
    fontWeight: 600,
    textDecoration: 'underline'
  }
});

// The interactive island of the auth screen. AuthScreen renders the
// eyebrow / title / lede around this; here we own the form fields, the
// sign-up terms gate, and the existing BFF auth flow (server action →
// cache migration → redirect). The BFF payload is unchanged: level is
// UI-only this pass and is never read here.
export function AuthForm({ mode, redirectTo = '/' }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const copy = AUTH_COPY[mode];

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const displayName = String(data.get('displayName') ?? '').trim();

    // Client-side password-length guard mirroring the BFF zod schema
    // (`password.min(8)` on sign-up; sign-in stays unconstrained so users
    // who created an account before this rule existed can still get in).
    // The helper text already advertises 8+ characters; failing here saves
    // a server round-trip and lets a11y users hear the same error banner.
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Sign-up terms gate: block submission and move focus to the checkbox
    // so the requirement is announced rather than silently failing.
    if (mode === 'signup' && !agreedToTerms) {
      setTermsError('Please accept the Terms of Service and Privacy Policy to continue.');
      termsRef.current?.focus();
      return;
    }
    setTermsError(null);

    startTransition(async () => {
      try {
        if (mode === 'signup') {
          await signUpAction({
            email,
            password,
            displayName: displayName ? displayName : undefined
          });
        } else {
          await signInAction({ email, password });
        }
        // Drop any pre-rollout anonymous data before pulling the
        // freshly authenticated view from the BFF.
        clearLocalCache();
        await refreshAllFromBff();
        // `redirectTo` can be either an unlocalized href or a path the
        // server already locale-prefixed; strip any leading /en or /ar so
        // the locale-aware router doesn't double-prefix.
        const unlocalized = redirectTo.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
        router.replace(unlocalized);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  return (
    <>
      <form className={formClass} onSubmit={onSubmit} noValidate>
        {error && (
          <div className={errorClass} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {mode === 'signup' && (
          <>
            <OAuthButtons variant="full" />
            <Divider label="Or with email" />
          </>
        )}

        {mode === 'signup' && (
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="auth-display-name">
              Your name
            </label>
            <input
              id="auth-display-name"
              className={inputClass}
              type="text"
              name="displayName"
              autoComplete="name"
              maxLength={64}
              disabled={pending}
            />
          </div>
        )}

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className={inputClass}
            type="email"
            name="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </div>

        <PasswordField
          id="auth-password"
          name="password"
          label="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          disabled={pending}
          helperText={
            mode === 'signup' ? 'Use 8+ characters with a mix of letters and numbers.' : undefined
          }
        />

        {mode === 'signup' && <LevelSelector disabled={pending} />}

        {mode === 'signup' && (
          <div className={fieldClass}>
            <div className={termsRowClass}>
              <input
                ref={termsRef}
                id="auth-terms"
                type="checkbox"
                className={termsCheckboxClass}
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
              <label className={termsLabelClass} htmlFor="auth-terms">
                I agree to the <a href="/terms">Terms of Service</a> and{' '}
                <a href="/privacy">Privacy Policy</a>.
              </label>
            </div>
            {termsError && (
              <p id="auth-terms-error" className={termsErrorClass} role="alert">
                {termsError}
              </p>
            )}
          </div>
        )}

        <button className={submitClass} type="submit" disabled={pending}>
          <span aria-hidden="true">→</span>
          {pending ? copy.submitPending : copy.submit}
        </button>

        {mode === 'signin' && (
          <>
            <Divider label="Or" />
            <OAuthButtons variant="compact" />
          </>
        )}
      </form>

      <p className={footerClass}>
        {mode === 'signin' ? (
          <>
            New to Tilawah? <Link href="/sign-up">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </>
        )}
      </p>
    </>
  );
}
