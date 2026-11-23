import { getTranslations } from 'next-intl/server';
import { css } from '../../../../../styled-system/css';
import { AutoFocusHeading } from './AutoFocusHeading';
import { toneForVerdict, type VerdictKind, type VerdictTone } from './verdict';

interface Props {
  verdict: VerdictKind;
}

const blockClass = css({ display: 'flex', flexDirection: 'column', gap: '2' });

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

// Headings take the colour of their container; the old global heading rule
// would otherwise draw them in the old ink colour.
const headlineClass = css({
  margin: '0',
  color: '[inherit]',
  textStyle: 'headlineSmall',
  _focus: { outline: 'none' }
});

const subheadClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const ICON_PATHS: Record<VerdictTone, string[]> = {
  pass: ['M5 12l5 5L20 7'],
  warn: ['M12 7v6', 'M12 17h.01'],
  fail: ['M7 7l10 10', 'M17 7L7 17'],
  neutral: []
};

export async function VerdictBlock({ verdict }: Props) {
  const t = await getTranslations(`result.verdict.${verdict}`);
  const tone = toneForVerdict(verdict);
  return (
    <div className={blockClass}>
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
        {t('badge')}
      </span>
      <AutoFocusHeading className={headlineClass}>{t('headline')}</AutoFocusHeading>
      <p className={subheadClass}>{t('subhead')}</p>
    </div>
  );
}
