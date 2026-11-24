import type { ReactNode } from 'react';
import { css } from '../../styled-system/css';

interface Props {
  children: ReactNode;
}

const panelClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  paddingBlock: '3',
  paddingInline: '4',
  borderRadius: 'medium',
  background: 'errorContainer',
  color: 'onErrorContainer',
  textStyle: 'bodyMedium'
});

const iconClass = css({ flexShrink: 0 });

/** A message that something failed, announced when it appears. */
export function ErrorPanel({ children }: Props) {
  return (
    <div className={panelClass} role="alert">
      <svg
        className={iconClass}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
