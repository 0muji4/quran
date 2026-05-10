'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInAction, signUpAction } from '../actions';
import styles from '../styles/auth.module.css';

type Mode = 'signin' | 'signup';

type Props = {
  mode: Mode;
  redirectTo?: string;
};

const COPY: Record<Mode, { eyebrow: string; title: string; lede: string; submit: string }> = {
  signin: {
    eyebrow: 'Welcome back',
    title: 'Sign in',
    lede: 'Pick up where you left off and keep your best scores in sync across devices.',
    submit: 'Sign in'
  },
  signup: {
    eyebrow: 'Create your account',
    title: 'Sign up',
    lede: 'Save your attempts, track your best scores, and continue practising on any device.',
    submit: 'Create account'
  }
};

export function AuthForm({ mode, redirectTo = '/' }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const displayName = String(data.get('displayName') ?? '').trim();

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
        router.replace(redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-labelledby="auth-title">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 id="auth-title" className={styles.title}>
          {copy.title}
        </h1>
        <p className={styles.lede}>{copy.lede}</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {error && (
            <div className={styles.error} role="alert" aria-live="polite">
              {error}
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

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              required
              disabled={pending}
            />
          </div>

          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-display-name">
                Display name (optional)
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

          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? 'Submitting…' : copy.submit}
          </button>
        </form>

        <p className={styles.aside}>
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
      </section>
    </div>
  );
}
