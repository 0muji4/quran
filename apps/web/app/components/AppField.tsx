import type { ComponentProps, ReactNode } from 'react';
import { css, cx } from '../../styled-system/css';
import { appTextField } from '../../styled-system/recipes';

interface FieldProps {
  id: string;
  label: ReactNode;
  /** Supporting text under the control. */
  helper?: ReactNode;
}

const fieldClass = css({ display: 'flex', flexDirection: 'column', gap: '1', minWidth: '[0]' });

const labelClass = css({ textStyle: 'labelLarge', color: 'onSurface' });

const helperClass = css({
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant',
  overflowWrap: 'anywhere'
});

const selectWrapClass = css({ position: 'relative', display: 'flex' });

const selectClass = cx(
  appTextField(),
  css({ appearance: 'none', paddingInlineEnd: '12', textOverflow: 'ellipsis', cursor: 'pointer' })
);

const arrowClass = css({
  position: 'absolute',
  insetInlineEnd: '3',
  top: '[50%]',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: 'onSurfaceVariant'
});

const helperId = (id: string, helper: ReactNode): string | undefined =>
  helper === undefined ? undefined : `${id}-helper`;

function Field({ id, label, helper, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className={fieldClass}>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      {children}
      {helper !== undefined && (
        <span id={helperId(id, helper)} className={helperClass}>
          {helper}
        </span>
      )}
    </div>
  );
}

type TextFieldProps = FieldProps & Omit<ComponentProps<'input'>, 'className'>;

/** A labelled text input, drawn as a Material 3 outlined text field. */
export function TextField({ id, label, helper, ...input }: TextFieldProps) {
  return (
    <Field id={id} label={label} helper={helper}>
      <input
        id={id}
        className={appTextField()}
        aria-describedby={helperId(id, helper)}
        {...input}
      />
    </Field>
  );
}

type SelectFieldProps = FieldProps & Omit<ComponentProps<'select'>, 'className'>;

/** A labelled select, drawn as a Material 3 outlined text field. */
export function SelectField({ id, label, helper, children, ...select }: SelectFieldProps) {
  return (
    <Field id={id} label={label} helper={helper}>
      <span className={selectWrapClass}>
        <select id={id} className={selectClass} aria-describedby={helperId(id, helper)} {...select}>
          {children}
        </select>
        <svg
          className={arrowClass}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </span>
    </Field>
  );
}
