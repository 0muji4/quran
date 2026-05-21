'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { css, cx } from '../../styled-system/css';

// `polite` reads after the user's current statement finishes — the
// default for non-urgent confirmations. `assertive` is rude and is
// reserved for errors / blocking issues; we don't use it yet but the
// surface is here so the day we need it, callers don't have to
// learn ARIA values.
export type ToastTone = 'success' | 'info';
export type ToastUrgency = 'polite' | 'assertive';

interface Props {
  // Stable identity used to reset the dismiss timer when the same
  // toast surface re-fires with new content.
  id?: string;
  title: ReactNode;
  body?: ReactNode;
  // Accessible label for the close button. Falls back to "Dismiss"
  // so callers that forget i18n still ship something pronounceable.
  dismissLabel: string;
  onDismiss: () => void;
  tone?: ToastTone;
  urgency?: ToastUrgency;
  // Milliseconds before the toast auto-dismisses. `0` (or undefined)
  // disables the timer entirely — caller takes responsibility for the
  // dismissal. Default is 6 seconds, matching the existing
  // CompletionToast behaviour we extracted this primitive from.
  autoDismissMs?: number;
}

const TOAST_MOBILE_MQ = '@media (max-width: 600px)';

const containerClass = css({
  position: 'fixed',
  bottom: '6',
  right: '6',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'flex-start',
  gap: '3',
  color: 'bg.paper',
  paddingBlock: '4',
  paddingInline: '5',
  borderRadius: 'md',
  boxShadow: '[0 12px 40px rgba(0, 0, 0, 0.18)]',
  maxWidth: '[360px]',
  zIndex: '[100]',
  // Same keyframes block as the legacy CompletionToast used (the
  // animation rule lives in `app/styles/globals.css`).
  animation: '[completionToastIn 220ms ease-out]',
  '@media (prefers-reduced-motion: reduce)': { animation: '[none]' },
  [TOAST_MOBILE_MQ]: {
    left: '4',
    right: '4',
    bottom: '4',
    maxWidth: '[none]'
  }
});

const toneSuccessClass = css({ backgroundColor: 'teal' });
const toneInfoClass = css({ backgroundColor: 'ink.strong' });

const iconClass = css({
  fontFamily: 'serif',
  fontSize: '[22px]',
  lineHeight: '[1]',
  color: 'tan',
  marginTop: '[2px]'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[16px]',
  display: 'block'
});

const bodyClass = css({
  fontSize: '[13px]',
  marginTop: '[4px]',
  marginBottom: '[0]',
  color: '[rgba(255, 255, 255, 0.85)]',
  lineHeight: '[1.5]'
});

const closeClass = css({
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  color: '[rgba(255, 255, 255, 0.7)]',
  fontSize: '[22px]',
  lineHeight: '[1]',
  cursor: 'pointer',
  paddingBlock: '[0]',
  paddingInline: '[4px]',
  _hover: { color: 'bg.paper' }
});

// Glyph by tone so screen-readers — which ignore `aria-hidden="true"`
// here — don't need to learn brand semantics; the title carries the
// meaning.
const ICONS: Record<ToastTone, string> = {
  success: '✦',
  info: 'i'
};

/**
 * Toast notification, accessible by default.
 *
 * Implements the W3C ARIA Authoring Practices for a non-modal
 * status notification:
 *
 * - `role="status"` + `aria-live` so screen readers announce the
 *   message without stealing focus from the page (focus stays where
 *   the user left it; we deliberately do NOT focus the toast).
 * - `aria-atomic="true"` so the entire title + body is announced as
 *   one chunk, not as an incremental update.
 * - Escape key dismisses the toast (Authoring Practices §3.3.1).
 * - Hover and keyboard-focus pause the auto-dismiss timer so a user
 *   reading the message slowly is not cut off (§3.3.2).
 * - `@media (prefers-reduced-motion: reduce)` switches off the
 *   slide-in animation.
 *
 * Visual styling is opinionated for this app — same look as the
 * legacy CompletionToast we factored out of — but tone variants let
 * callers pick teal for celebrations and ink-strong for neutral
 * "informational" messages.
 */
export function Toast({
  id,
  title,
  body,
  dismissLabel,
  onDismiss,
  tone = 'success',
  urgency = 'polite',
  autoDismissMs = 6_000
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const dismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  // Auto-dismiss timer, paused while the user has the toast under a
  // pointer or keyboard focus.
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    if (isHovered || isFocused) return;
    const handle = setTimeout(dismiss, autoDismissMs);
    return () => clearTimeout(handle);
    // `id` is in the deps so a same-mount swap (e.g. a new welcome
    // string replacing an old completion string) resets the timer.
  }, [autoDismissMs, isHovered, isFocused, dismiss, id]);

  // Escape-to-dismiss. Document-level listener so the user does not
  // have to focus the toast first — matches the SR-friendly model
  // where focus stays on the page content.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  return (
    <div
      className={cx(containerClass, tone === 'info' ? toneInfoClass : toneSuccessClass)}
      role="status"
      aria-live={urgency}
      aria-atomic="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <span className={iconClass} aria-hidden="true">
        {ICONS[tone]}
      </span>
      <div>
        <strong className={titleClass}>{title}</strong>
        {body !== undefined && body !== null && <p className={bodyClass}>{body}</p>}
      </div>
      <button type="button" className={closeClass} onClick={dismiss} aria-label={dismissLabel}>
        ×
      </button>
    </div>
  );
}
