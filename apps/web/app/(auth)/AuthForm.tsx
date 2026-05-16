'use client';

import { FormEvent, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInAction, signUpAction } from '../actions';
import { clearLocalCache, refreshAllFromBff } from '../lib/storage';
import { AUTH_COPY, type AuthMode } from './copy';
import { Divider } from './Divider';
import { LevelSelector } from './LevelSelector';
import { OAuthButtons } from './OAuthButtons';
import { PasswordField } from './PasswordField';
import { RememberMeRow } from './RememberMeRow';
import styles from '../styles/auth.module.css';

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

// The interactive island of the auth screen. AuthScreen renders the
// eyebrow / title / lede around this; here we own the form fields, the
// sign-up terms gate, and the existing BFF auth flow (server action →
// cache migration → redirect). The BFF payload is unchanged: level and
// remember-me are UI-only this pass and are never read here.
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
        router.replace(redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  return (
    <>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && (
          <div className={styles.error} role="alert" aria-live="polite">
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
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-display-name">
              Your name
            </label>
            <input
              id="auth-display-name"
              className={styles.input}
              type="text"
              name="displayName"
              autoComplete="name"
              maxLength={64}
              disabled={pending}
            />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className={styles.input}
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

        {mode === 'signin' && <RememberMeRow disabled={pending} />}

        {mode === 'signup' && <LevelSelector disabled={pending} />}

        {mode === 'signup' && (
          <div className={styles.field}>
            <div className={styles.termsRow}>
              <input
                ref={termsRef}
                id="auth-terms"
                type="checkbox"
                className={styles.termsCheckbox}
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
              <label className={styles.termsLabel} htmlFor="auth-terms">
                I agree to the <a href="/terms">Terms of Service</a> and{' '}
                <a href="/privacy">Privacy Policy</a>.
              </label>
            </div>
            {termsError && (
              <p id="auth-terms-error" className={styles.termsError} role="alert">
                {termsError}
              </p>
            )}
          </div>
        )}

        <button className={styles.submit} type="submit" disabled={pending}>
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

      <p className={styles.footer}>
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
