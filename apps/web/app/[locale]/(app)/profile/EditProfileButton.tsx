'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { updateProfileAction, type UserLevel } from '../../../actions';
import { AppDialog } from '../../../components/AppDialog';
import { SelectField, TextField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';
import { actionsClass, bodyClass, footnoteClass, formClass } from './dialogStyles';

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

  // Reset modal state whenever it opens so a Cancel → re-open doesn't
  // carry over a stale draft.
  const openDialog = (): void => {
    setNameValue(displayName ?? email);
    setLevelValue(level ?? 'beginner');
    setError(null);
    setOpen(true);
  };

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
      <button type="button" className={buttonClass} onClick={openDialog} aria-haspopup="dialog">
        Edit profile
      </button>
      {open && (
        <AppDialog title="Edit profile" onClose={() => setOpen(false)}>
          <form className={formClass} onSubmit={onSubmit} noValidate>
            {error && <ErrorPanel>{error}</ErrorPanel>}

            <p className={bodyClass}>
              Your email and password are in <strong>Account &amp; data</strong> on the Profile
              page, next to <strong>Practice preferences</strong>.
            </p>

            <TextField
              id="edit-display-name"
              label="Display name"
              helper="Shown on your profile and in practice history."
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={64}
              autoComplete="name"
              disabled={pending}
              required
            />

            <SelectField
              id="edit-level"
              label="Skill level"
              helper="Used on your profile and to suggest surahs at your level."
              value={levelValue}
              onChange={(e) => setLevelValue(e.target.value as UserLevel)}
              disabled={pending}
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <p className={footnoteClass}>Changes sync to every signed-in device.</p>

            <div className={actionsClass}>
              <button
                type="button"
                className={appButton({ variant: 'text' })}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button type="submit" className={appButton({ variant: 'filled' })} disabled={pending}>
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </AppDialog>
      )}
    </>
  );
}
