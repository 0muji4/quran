'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/navigation';
import type { AyahRecord, SurahSummary } from '../../../../lib/types';
import styles from '../../../../styles/practice.module.css';

type Props = {
  surah: SurahSummary;
  ayah: AyahRecord;
  message: string;
};

export function ResultError({ surah, ayah, message }: Props) {
  const t = useTranslations('result.error');
  const tryAgainHref = `/practice/${surah.id}/${ayah.ayahNumber}`;
  return (
    <section className={styles.resultError} role="alert">
      <h1 className={styles.resultErrorTitle}>{t('title')}</h1>
      <p className={styles.resultErrorBody}>{message}</p>
      <Link href={tryAgainHref} className={`${styles.btnTeal} ${styles.resultPrimaryBtn}`}>
        {t('tryAgain')}
      </Link>
    </section>
  );
}
