'use client';

import { useTranslations } from 'next-intl';
import { LEVEL_VALUES } from './copy';
import { css } from '../../../../styled-system/css';

interface Props {
  disabled?: boolean;
}

const groupClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  minWidth: '[0]',
  margin: '0',
  padding: '0',
  borderWidth: '0',
  _disabled: { opacity: 0.38 }
});

const legendClass = css({
  padding: '0',
  marginBottom: '1',
  textStyle: 'labelLarge',
  color: 'onSurface'
});

// The options as a filled card of radio list items.
const listClass = css({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 'medium',
  background: 'surfaceContainerHighest',
  overflow: 'hidden'
});

const optionClass = css({
  position: 'relative',
  isolation: 'isolate',
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  minHeight: '[72px]',
  paddingBlock: '2',
  paddingInline: '4',
  color: 'onSurface',
  cursor: 'pointer',
  '& + &': { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'outlineVariant' },
  _before: {
    content: '""',
    position: 'absolute',
    inset: '0',
    background: 'currentColor',
    opacity: 0,
    zIndex: -1,
    transition: '[opacity 0.15s ease]'
  },
  _hover: { _before: { opacity: 0.08 } },
  'fieldset:disabled &': { cursor: 'default', _before: { opacity: 0 } }
});

const radioClass = css({
  // The browser draws the control; it follows the system colour scheme.
  colorScheme: 'light dark',
  flexShrink: 0,
  width: '[20px]',
  height: '[20px]',
  margin: '0',
  accentColor: 'primary',
  _focusVisible: {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]'
  }
});

const textClass = css({ display: 'flex', flexDirection: 'column', minWidth: '[0]' });

const titleClass = css({ textStyle: 'bodyLarge' });

const descriptionClass = css({ textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const helperClass = css({ textStyle: 'bodySmall', color: 'onSurfaceVariant' });

// The sign-up level picker: native radios in a fieldset, posted through
// `name="level"`. It takes `'use client'` so AuthForm (`'use client'`) can
// render it directly and so the translation hook works.
export function LevelSelector({ disabled }: Props) {
  const t = useTranslations('auth.level');

  return (
    <fieldset className={groupClass} disabled={disabled} aria-describedby="auth-level-helper">
      <legend className={legendClass}>{t('legend')}</legend>
      <div className={listClass}>
        {LEVEL_VALUES.map((value, index) => (
          <label key={value} className={optionClass}>
            <input
              type="radio"
              name="level"
              value={value}
              defaultChecked={index === 0}
              className={radioClass}
            />
            <span className={textClass}>
              <span className={titleClass}>{t(`${value}.label`)}</span>
              <span className={descriptionClass}>{t(`${value}.description`)}</span>
            </span>
          </label>
        ))}
      </div>
      <span id="auth-level-helper" className={helperClass}>
        {t('helper')}
      </span>
    </fieldset>
  );
}
