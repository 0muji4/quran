'use client';

import { useTranslations } from 'next-intl';
import { LEVEL_VALUES } from './copy';
import { css } from '../../../styled-system/css';

interface Props {
  disabled?: boolean;
}

const groupClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  margin: '[0]',
  padding: '[0]',
  borderWidth: '[0]'
});

const legendClass = css({
  marginBottom: '1',
  padding: '[0]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'ink.default'
});

const legendHintClass = css({
  fontSize: '[12px]',
  fontWeight: 400,
  color: 'ink.muted'
});

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '2',
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' }
});

// :has(input:checked) drives the selected-state border / fill purely
// from CSS, so no client component / React state is required for the
// visual feedback.
const cardClass = css({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: '3',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  cursor: 'pointer',
  transition: '[border-color 0.15s ease, background 0.15s ease]',
  '&:has(input:checked)': {
    borderColor: 'green',
    backgroundColor: 'mint.bg'
  },
  '&:has(input:focus-visible)': {
    outline: '[2px solid var(--colors-green)]',
    outlineOffset: '[2px]'
  }
});

const radioClass = css({
  position: 'absolute',
  top: '2',
  right: '2',
  margin: '[0]',
  accentColor: 'green'
});

const cardTextClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '[2px]',
  paddingRight: '4'
});

const cardTitleClass = css({
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'ink.strong'
});

const cardSubtitleClass = css({
  fontSize: '[12px]',
  lineHeight: '[1.3]',
  color: 'ink.muted'
});

// Sign-up "current level" picker. Native radios in a fieldset — the card
// styling is driven entirely by CSS (:has(:checked)), so no React state
// is needed; this only takes `'use client'` so AuthForm (`'use client'`)
// can render it directly and so the translation hook works.
export function LevelSelector({ disabled }: Props) {
  const t = useTranslations('auth.level');

  return (
    <fieldset className={groupClass} disabled={disabled}>
      <legend className={legendClass}>
        {t('legend')} <span className={legendHintClass}>{t('legendHint')}</span>
      </legend>
      <div className={gridClass}>
        {LEVEL_VALUES.map((value, index) => (
          <label key={value} className={cardClass}>
            <input
              type="radio"
              name="level"
              value={value}
              defaultChecked={index === 0}
              className={radioClass}
            />
            <span className={cardTextClass}>
              <span className={cardTitleClass}>{t(`${value}.label`)}</span>
              <span className={cardSubtitleClass}>{t(`${value}.description`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
