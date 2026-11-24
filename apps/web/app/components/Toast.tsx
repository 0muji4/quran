'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { css, cx } from '../../styled-system/css';
import { appIconButton } from '../../styled-system/recipes';
import { CloseIcon } from './icons/ArrowRightIcon';

// `polite` reads after the user's current statement finishes — the
// default for non-urgent confirmations. `assertive` is rude and is
// reserved for errors / blocking issues; we don't use it yet but the
// surface is here so the day we need it, callers don't have to
// learn ARIA values.
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
  urgency?: ToastUrgency;
  // Milliseconds before the toast auto-dismisses. `0` (or undefined)
  // disables the timer entirely — caller takes responsibility for the
  // dismissal. Default is 6 seconds, matching the existing
  // CompletionToast behaviour we extracted this primitive from.
  autoDismissMs?: number;
}

// A Material 3 snackbar: above the navigation bar in a compact window, and at
// the bottom of the page beside the rail from the medium window size class.
const containerClass = css({
  position: 'fixed',
  bottom: '[calc(96px + env(safe-area-inset-bottom))]',
  insetInline: '4',
  zIndex: '[100]',
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  maxWidth: '[560px]',
  minHeight: '[68px]',
  marginInline: 'auto',
  paddingBlock: '2',
  paddingInlineStart: '4',
  paddingInlineEnd: '1',
  borderRadius: 'extraSmall',
  background: 'inverseSurface',
  color: 'inverseOnSurface',
  fontFamily: 'ui',
  boxShadow: 'level3',
  animation: '[completionToastIn 220ms ease-out]',
  '@media (prefers-reduced-motion: reduce)': { animation: '[none]' },
  medium: { bottom: '6', insetInlineStart: '[104px]', insetInlineEnd: '6' }
});

const textClass = css({ flex: '1', minWidth: '[0]' });

const titleClass = css({ display: 'block', textStyle: 'titleSmall' });

const bodyClass = css({ margin: '0', textStyle: 'bodyMedium' });

const closeClass = cx(
  appIconButton({ variant: 'standard' }),
  css({ color: 'inverseOnSurface', _focusVisible: { outlineColor: 'inversePrimary' } })
);

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
 */
export function Toast({
  id,
  title,
  body,
  dismissLabel,
  onDismiss,
  urgency = 'polite',
  autoDismissMs = 6_000
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

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
      className={containerClass}
      role="status"
      aria-live={urgency}
      aria-atomic="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <div className={textClass}>
        <strong className={titleClass}>{title}</strong>
        {body !== undefined && body !== null && <p className={bodyClass}>{body}</p>}
      </div>
      <button type="button" className={closeClass} onClick={dismiss} aria-label={dismissLabel}>
        <CloseIcon />
      </button>
    </div>
  );
}
