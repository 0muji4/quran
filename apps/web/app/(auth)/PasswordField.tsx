'use client';

import { useId, useState } from 'react';
import styles from '../styles/auth.module.css';

type Props = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
};

// Password input with an inline Show / Hide toggle. The toggle is a real
// button (aria-pressed + aria-controls) so the visibility state is exposed
// to assistive tech rather than being a silent type swap.
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
  const helperId = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.passwordRow}>
        <input
          id={id}
          className={`${styles.input} ${styles.passwordInput}`}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          disabled={disabled}
          aria-describedby={helperText ? helperId : undefined}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-controls={id}
          disabled={disabled}
        >
          {visible ? 'Hide' : 'Show'}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {helperText && (
        <p id={helperId} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
}
