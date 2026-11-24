import type { ReactNode } from 'react';
import { css } from '../../../../../styled-system/css';
import type { VerdictTone } from './verdict';

interface Props {
  tone: VerdictTone;
  children: ReactNode;
}

// A non-interactive chip in the verdict's container colour.
const chipClass = css({
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '[6px]',
  minHeight: '[32px]',
  paddingInline: '3',
  borderRadius: 'small',
  textStyle: 'labelLarge',
  background: 'secondaryContainer',
  color: 'onSecondaryContainer',
  '&[data-tone=pass]': { background: 'passContainer', color: 'onPassContainer' },
  '&[data-tone=warn]': { background: 'warnContainer', color: 'onWarnContainer' },
  '&[data-tone=fail]': { background: 'failContainer', color: 'onFailContainer' }
});

const ICON_PATHS: Record<VerdictTone, string[]> = {
  pass: ['M5 12l5 5L20 7'],
  warn: ['M12 7v6', 'M12 17h.01'],
  fail: ['M7 7l10 10', 'M17 7L7 17'],
  neutral: []
};

/** A verdict's label or score on its colour, with the icon that repeats the tone. */
export function VerdictChip({ tone, children }: Props) {
  return (
    <span className={chipClass} data-tone={tone}>
      {ICON_PATHS[tone].length > 0 ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICON_PATHS[tone].map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      ) : null}
      {children}
    </span>
  );
}
