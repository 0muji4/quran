import { getTranslations } from 'next-intl/server';
import { css } from '../../../../../styled-system/css';
import { AutoFocusHeading } from './AutoFocusHeading';
import { VerdictChip } from './VerdictChip';
import { toneForVerdict, type VerdictKind } from './verdict';

interface Props {
  verdict: VerdictKind;
}

const blockClass = css({ display: 'flex', flexDirection: 'column', gap: '2' });

// Headings take the colour of their container; the old global heading rule
// would otherwise draw them in the old ink colour.
const headlineClass = css({
  margin: '0',
  color: '[inherit]',
  textStyle: 'headlineSmall',
  _focus: { outline: 'none' }
});

const subheadClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

export async function VerdictBlock({ verdict }: Props) {
  const t = await getTranslations(`result.verdict.${verdict}`);
  return (
    <div className={blockClass}>
      <VerdictChip tone={toneForVerdict(verdict)}>{t('badge')}</VerdictChip>
      <AutoFocusHeading className={headlineClass}>{t('headline')}</AutoFocusHeading>
      <p className={subheadClass}>{t('subhead')}</p>
    </div>
  );
}
