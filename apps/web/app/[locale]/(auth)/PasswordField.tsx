'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { css, cx } from '../../../styled-system/css';

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

// Duplicates AuthForm's field/label/input shapes so PasswordField stays
// self-contained. When the same shape shows up in a third auth component
// we'll factor them out — for now two callsites is below the
// abstraction threshold.
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

const passwordRowClass = css({
  position: 'relative',
  display: 'flex'
});

// Leave room for the Show / Hide toggle (~68px on the right).
const passwordInputExtraClass = css({ paddingRight: '[68px]' });

const passwordToggleClass = css({
  position: 'absolute',
  right: '2',
  top: '[50%]',
  transform: '[translateY(-50%)]',
  font: '[inherit]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'teal.deep',
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  paddingBlock: '1',
  paddingInline: '2',
  cursor: 'pointer',
  _disabled: { color: 'ink.muted', cursor: 'not-allowed' }
});

const helperTextClass = css({
  marginTop: '1',
  fontSize: '[12px]',
  color: 'ink.muted'
});

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
  const t = useTranslations('auth.password');

  return (
    <div className={fieldClass}>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className={passwordRowClass}>
        <input
          id={id}
          className={cx(inputClass, passwordInputExtraClass)}
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
          className={passwordToggleClass}
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-controls={id}
          disabled={disabled}
        >
          {visible ? t('hide') : t('show')}
          <span className="sr-only"> {t('a11ySuffix')}</span>
        </button>
      </div>
      {helperText && (
        <p id={helperId} className={helperTextClass}>
          {helperText}
        </p>
      )}
    </div>
  );
}
