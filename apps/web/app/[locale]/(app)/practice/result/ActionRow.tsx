'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '../../../../components/icons/ArrowRightIcon';
import styles from '../../../../styles/practice.module.css';

interface Props {
  surahId: string;
  surahName: string;
  ayahNumber: number;
  totalAyahs: number;
}

export function ActionRow({ surahId, surahName, ayahNumber, totalAyahs }: Props) {
  const t = useTranslations('result.action');
  const tryAgainHref = `/practice/${surahId}/${ayahNumber}`;
  const isLastAyah = ayahNumber >= totalAyahs;
  // On the final ayah, route home with a hint so the library page can show a
  // celebration toast. Encoding the surah name keeps the toast self-contained
  // without re-fetching the surah list to look up a display string.
  const continueHref = isLastAyah
    ? `/?completed=${encodeURIComponent(surahName)}`
    : `/practice/${surahId}/${ayahNumber + 1}`;
  const continueLabel = isLastAyah ? t('finish') : t('continue', { next: ayahNumber + 1 });

  // Persistence is automatic: `recordAttempt()` writes to localStorage and the
  // BFF the moment scoring completes (RecorderPanel). No manual save action —
  // the iOS client has none either, and a placeholder "Save" button confused
  // users into thinking the save was opt-in.
  return (
    <div className={styles.resultActionRow}>
      <Link href={tryAgainHref} className={styles.btnGhost}>
        <ArrowLeftIcon /> {t('tryAgain')}
      </Link>
      <Link href={continueHref} className={`${styles.btnGreen} ${styles.resultPrimaryBtn}`}>
        {continueLabel} <ArrowRightIcon />
      </Link>
    </div>
  );
}
