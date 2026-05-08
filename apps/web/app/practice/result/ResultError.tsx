import Link from 'next/link';
import type { AyahRecord, SurahSummary } from '../../lib/types';
import styles from '../../styles/practice.module.css';

type Props = {
  surah: SurahSummary;
  ayah: AyahRecord;
  message: string;
};

export function ResultError({ surah, ayah, message }: Props) {
  const tryAgainHref = `/practice/${surah.id}/${ayah.ayahNumber}`;
  return (
    <section className={styles.resultError} role="alert">
      <h1 className={styles.resultErrorTitle}>Something went wrong</h1>
      <p className={styles.resultErrorBody}>{message}</p>
      <Link href={tryAgainHref} className={`${styles.btnTeal} ${styles.resultPrimaryBtn}`}>
        Try again
      </Link>
    </section>
  );
}
