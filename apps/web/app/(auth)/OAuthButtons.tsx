import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { css } from '../../styled-system/css';

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
export function OAuthButtons({ variant }: Props) {
  const googleLabel = variant === 'full' ? 'Continue with Google' : 'Google';
  const appleLabel = variant === 'full' ? 'Continue with Apple' : 'Apple';

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={buttonClass}
        disabled
        aria-label={`${googleLabel} — coming soon`}
      >
        <GoogleIcon />
        <span>{googleLabel}</span>
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled
        aria-label={`${appleLabel} — coming soon`}
      >
        <AppleIcon />
        <span>{appleLabel}</span>
      </button>
    </div>
  );
}
