'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TextField } from '../../../components/AppField';
import { appIconButton } from '../../../../styled-system/recipes';

interface Props {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

// A password field with a Show password icon button at its end. The button
// is a toggle: its name stays and aria-pressed says whether the password
// shows, so assistive tech hears the state rather than a silent type swap.
export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength,
  required = true,
  disabled,
  helperText
}: Props) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations('auth.password');

  return (
    <TextField
      id={id}
      label={label}
      helper={helperText}
      type={visible ? 'text' : 'password'}
      name={name}
      autoComplete={autoComplete}
      minLength={minLength}
      required={required}
      disabled={disabled}
      trailing={
        <button
          type="button"
          className={appIconButton()}
          onClick={() => setVisible((value) => !value)}
          aria-label={t('show')}
          aria-pressed={visible}
          aria-controls={id}
          disabled={disabled}
        >
          <EyeIcon crossed={visible} />
        </button>
      }
    />
  );
}

/** The eye, struck through while the password shows. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}
