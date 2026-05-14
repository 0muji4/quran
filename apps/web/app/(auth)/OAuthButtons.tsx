import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import styles from '../styles/auth.module.css';

type Props = {
  // 'full' → "Continue with Google" (sign-up, primary placement);
  // 'compact' → "Google" (sign-in, below the email path).
  variant: 'compact' | 'full';
};

// Google / Apple sign-in buttons. Rendered to match the design but
// disabled — federated auth is deferred per ADR 0010 (no OAuth client
// config yet). The aria-label spells out why they are inert.
export function OAuthButtons({ variant }: Props) {
  const googleLabel = variant === 'full' ? 'Continue with Google' : 'Google';
  const appleLabel = variant === 'full' ? 'Continue with Apple' : 'Apple';

  return (
    <div className={styles.oauthRow}>
      <button
        type="button"
        className={styles.oauthButton}
        disabled
        aria-label={`${googleLabel} — coming soon`}
      >
        <GoogleIcon />
        <span>{googleLabel}</span>
      </button>
      <button
        type="button"
        className={styles.oauthButton}
        disabled
        aria-label={`${appleLabel} — coming soon`}
      >
        <AppleIcon />
        <span>{appleLabel}</span>
      </button>
    </div>
  );
}
