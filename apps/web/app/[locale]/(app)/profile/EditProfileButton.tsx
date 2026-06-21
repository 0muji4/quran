'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { updateProfileAction, type UserLevel } from '../../../actions';
import { css } from '../../../../styled-system/css';

interface Props {
  displayName: string | null;
  email: string;
  level: UserLevel | null;
}

const buttonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  '&:hover': { borderColor: 'ink.muted' }
});

const overlayClass = css({
  position: 'fixed',
  inset: '[0]',
  backgroundColor: '[rgba(36, 30, 25, 0.45)]',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '[40]',
  padding: '4'
});

const modalClass = css({
  backgroundColor: 'bg.paper',
  borderRadius: 'md',
  width: '[100%]',
  maxWidth: '[520px]',
  padding: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  boxShadow: 'card'
});

const eyebrowClass = css({
  fontSize: '[12px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.08em]',
  color: 'gold.onLight'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[26px]',
  color: 'ink.strong'
});

const fieldClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2'
});

const labelClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  color: 'ink.muted'
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

const helperClass = css({
  fontSize: '[12px]',
  color: 'ink.muted'
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

const actionsClass = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '3',
  flexWrap: 'wrap'
});

const cancelButtonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer'
});

const saveButtonClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2',
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '[0]',
  backgroundColor: 'teal',
  color: 'tan.soft',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

const headerRowClass = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '4'
});

const closeButtonClass = css({
  flexShrink: 0,
  width: '[32px]',
  height: '[32px]',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'ink.muted',
  fontSize: '[18px]',
  lineHeight: '[1]',
  cursor: 'pointer',
  '&:hover': { borderColor: 'ink.muted', color: 'ink.strong' }
});

// PROFILE PHOTO section. UI-only: upload/remove are inert placeholders.
// TODO(profile-photo): wire to an avatar-upload endpoint.
const photoSectionClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  flexWrap: 'wrap'
});
const photoColumnClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  flex: '1',
  minWidth: '[200px]'
});
const photoLabelClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  color: 'ink.muted'
});
const photoActionsClass = css({ display: 'flex', alignItems: 'center', gap: '3' });
const photoAvatarClass = css({
  width: '[64px]',
  height: '[64px]',
  borderRadius: '[50%]',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'bg.paper',
  fontFamily: 'serif',
  fontSize: '[24px]',
  flexShrink: 0,
  background:
    '[radial-gradient(circle at 35% 30%, var(--colors-gold-surface), var(--colors-bg-nav))]'
});
const uploadButtonClass = css({
  paddingBlock: '2',
  paddingInline: '4',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  fontSize: '[13px]',
  fontWeight: 600,
  cursor: 'not-allowed',
  opacity: 0.55
});
const removeButtonClass = css({
  font: '[inherit]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'red',
  background: '[transparent]',
  borderWidth: '[0]',
  padding: '[0]',
  cursor: 'not-allowed',
  opacity: 0.55
});

// Tan info callout pointing email/password + preferences to where they
// actually live, so this modal stays scoped to name + level + photo.
const calloutClass = css({
  display: 'flex',
  gap: '2',
  backgroundColor: 'tan.soft',
  borderRadius: 'md',
  paddingBlock: '3',
  paddingInline: '4',
  fontSize: '[13px]',
  color: 'ink.default',
  lineHeight: '[1.5]'
});

const footerClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4',
  flexWrap: 'wrap'
});

const syncTextClass = css({ fontSize: '[12px]', color: 'ink.muted' });

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner · Learning Arabic' },
  { value: 'intermediate', label: 'Intermediate · Working on tajweed' },
  { value: 'advanced', label: 'Advanced · Polishing recitation' }
];

// Inline "Edit profile" trigger + modal. Lives next to the header
// card so the modal can read the current `displayName` / `level` and
// pre-fill the fields — no extra fetch required. On save, we call
// `updateProfileAction` (PATCH /auth/me) and refresh the route so
// the Server Component re-fetches the latest profile.
export function EditProfileButton({ displayName, email, level }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameValue, setNameValue] = useState(displayName ?? email);
  const [levelValue, setLevelValue] = useState<UserLevel>(level ?? 'beginner');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const photoInitial = (nameValue.trim().charAt(0) || email.charAt(0) || '·').toUpperCase();

  // Reset modal state whenever it opens so a Cancel → re-open doesn't
  // carry over a stale draft.
  useEffect(() => {
    if (open) {
      setNameValue(displayName ?? email);
      setLevelValue(level ?? 'beginner');
      setError(null);
      // Focus the first field for keyboard users.
      firstFieldRef.current?.focus();
    }
  }, [open, displayName, email, level]);

  // Esc closes the modal — table-stakes affordance.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);

    const trimmedName = nameValue.trim();
    if (trimmedName.length === 0) {
      setError('Display name is required.');
      return;
    }

    startTransition(async () => {
      try {
        // Send only the fields that actually changed so the BFF can
        // log accurate audit lines and we don't churn the updated_at
        // timestamp on a no-op edit.
        const payload: { displayName?: string; level?: UserLevel } = {};
        if (trimmedName !== (displayName ?? email)) payload.displayName = trimmedName;
        if (levelValue !== (level ?? 'beginner')) payload.level = levelValue;
        if (Object.keys(payload).length === 0) {
          setOpen(false);
          return;
        }
        await updateProfileAction(payload);
        setOpen(false);
        // The Server Component re-fetches `/auth/me` on the next paint
        // and re-renders the header card with the saved values.
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Edit profile
      </button>
      {open && (
        <div
          className={overlayClass}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form className={modalClass} onSubmit={onSubmit} noValidate>
            <div className={headerRowClass}>
              <div>
                <p className={eyebrowClass}>
                  <span aria-hidden="true">✦ </span>Your account
                </p>
                <h2 className={titleClass}>Edit profile</h2>
              </div>
              <button
                type="button"
                className={closeButtonClass}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {error && (
              <div className={errorClass} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <div className={photoSectionClass}>
              <span className={photoAvatarClass} aria-hidden="true">
                {photoInitial}
              </span>
              <div className={photoColumnClass}>
                <span className={photoLabelClass}>Profile photo</span>
                <div className={photoActionsClass}>
                  <button type="button" className={uploadButtonClass} disabled title="Coming soon">
                    Upload photo
                  </button>
                  <button type="button" className={removeButtonClass} disabled title="Coming soon">
                    Remove
                  </button>
                </div>
                <span className={helperClass}>
                  Square, ≥ 200×200px. JPG, PNG, or WebP up to 2MB.
                </span>
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass} htmlFor="edit-display-name">
                Display name
              </label>
              <input
                ref={firstFieldRef}
                id="edit-display-name"
                className={inputClass}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                maxLength={64}
                autoComplete="name"
                disabled={pending}
                required
              />
              <span className={helperClass}>Shown on your profile and in practice history.</span>
            </div>

            <div className={fieldClass}>
              <label className={labelClass} htmlFor="edit-level">
                Skill level
              </label>
              <select
                id="edit-level"
                className={inputClass}
                value={levelValue}
                onChange={(e) => setLevelValue(e.target.value as UserLevel)}
                disabled={pending}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className={helperClass}>
                Used on your profile and to suggest surahs at your level.
              </span>
            </div>

            <p className={calloutClass}>
              <span aria-hidden="true">ⓘ</span>
              <span>
                Looking to change your <strong>email or password</strong>? They live in{' '}
                <strong>Account &amp; data</strong> on the Profile page. Practice{' '}
                <strong>preferences</strong> (reciter, speed, reminders) are right next to it.
              </span>
            </p>

            <div className={footerClass}>
              <span className={syncTextClass}>Changes sync to every signed-in device.</span>
              <div className={actionsClass}>
                <button
                  type="button"
                  className={cancelButtonClass}
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button type="submit" className={saveButtonClass} disabled={pending}>
                  <span aria-hidden="true">✓</span>
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
