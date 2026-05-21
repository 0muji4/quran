import { getTranslations } from 'next-intl/server';
import styles from '../../../../styles/practice.module.css';
import { AutoFocusHeading } from './AutoFocusHeading';
import type { VerdictKind } from './verdict';

interface Props {
  verdict: VerdictKind;
}

export async function VerdictBlock({ verdict }: Props) {
  const t = await getTranslations(`result.verdict.${verdict}`);
  return (
    <div className={styles.verdictBlock}>
      <span className={styles.verdictBadge}>
        <span aria-hidden="true">← </span>
        {t('badge')}
      </span>
      <AutoFocusHeading className={styles.verdictHeadline}>{t('headline')}</AutoFocusHeading>
      <p className={styles.verdictSubhead}>{t('subhead')}</p>
    </div>
  );
}
