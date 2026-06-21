'use client';

import type { FormEvent } from 'react';
import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '../../../i18n/navigation';
import { signInAction, signUpAction } from '../../actions';
import { clearLocalCache, refreshAllFromBff } from '../../lib/storage';
import type { AuthMode } from './copy';
import { Divider } from './Divider';
import { LevelSelector } from './LevelSelector';
import { OAuthButtons } from './OAuthButtons';
import { PasswordField } from './PasswordField';
import { css } from '../../../styled-system/css';

interface Props {
  mode: AuthMode;
  redirectTo?: string;
}

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

// Right-aligned "Forgot password?" shown on sign-in. Password reset is
// deferred per ADR 0010, so — like iOS and the OAuth buttons — it is
// rendered disabled/dimmed rather than linking to a route that does not
// exist yet.
const forgotRowClass = css({ display: 'flex', justifyContent: 'flex-end' });

const forgotLinkClass = css({
  font: '[inherit]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'teal.deep',
  background: '[transparent]',
  borderWidth: '[0]',
  padding: '[0]',
  cursor: 'not-allowed',
  opacity: 0.55
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
  const t = useTranslations('auth');
  const modeT = useTranslations(`auth.${mode}`);

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
        // Drop any pre-rollout anonymous data before pulling the
        // freshly authenticated view from the BFF.
        clearLocalCache();
        await refreshAllFromBff();
        // `redirectTo` can be either an unlocalized href or a path the
        // server already locale-prefixed; strip any leading /en or /ar so
        // the locale-aware router doesn't double-prefix.
        const unlocalized = redirectTo.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
        // ADR-0024 §4: surface the welcome-back toast when sign-in just
        // resurrected a soft-deleted account. The destination layout
        // picks `?welcome-back=1` up via WelcomeBackToast and strips it
        // off the URL after the toast disappears.
        const destination = reactivated
          ? `${unlocalized}${unlocalized.includes('?') ? '&' : '?'}welcome-back=1`
          : unlocalized;
        router.replace(destination);
        router.refresh();
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
        {error && (
          <div className={errorClass} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {mode === 'signup' && (
          <>
            <OAuthButtons variant="full" />
            <Divider label={t('divider.orWithEmail')} />
          </>
        )}

        {mode === 'signup' && (
          <div className={fieldClass}>
            <label className={labelClass} htmlFor="auth-display-name">
              {t('field.name')}
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
            {t('field.email')}
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
          label={t('field.password')}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          disabled={pending}
          helperText={mode === 'signup' ? t('password.helper') : undefined}
        />

        {mode === 'signin' && (
          <div className={forgotRowClass}>
            <button type="button" className={forgotLinkClass} disabled title="Coming soon">
              {t('forgotPassword')}
            </button>
          </div>
        )}

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
                {t.rich('terms.label', {
                  tosLink: (chunks) => <a href="/terms">{chunks}</a>,
                  privacyLink: (chunks) => <a href="/privacy">{chunks}</a>
                })}
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
          {pending ? modeT('submitPending') : modeT('submit')}
        </button>

        {mode === 'signin' && (
          <>
            <Divider label={t('divider.or')} />
            <OAuthButtons variant="compact" />
          </>
        )}
      </form>

      <p className={footerClass}>
        {mode === 'signin' ? (
          <>
            {modeT('footerPrompt')} <Link href="/sign-up">{modeT('footerAction')}</Link>
          </>
        ) : (
          <>
            {modeT('footerPrompt')} <Link href="/sign-in">{modeT('footerAction')}</Link>
          </>
        )}
      </p>
    </>
  );
}
