'use client';

import Link from 'next/link';
import type { SurahSummary } from '../lib/types';
import { ChevronRightIcon } from '../components/icons/ArrowRightIcon';
import styles from '../styles/library.module.css';

type Props = {
  surah: SurahSummary;
  bestScore: number | null;
  isLastPracticed: boolean;
};

export function SurahCard({ surah, bestScore, isLastPracticed }: Props) {
  const className = isLastPracticed
    ? `${styles.surahCard} ${styles.surahCardActive}`
    : styles.surahCard;
  return (
    <Link href={`/practice/${surah.id}/1`} className={className}>
      <span className={styles.surahNumber} aria-hidden="true">
        {surah.id}
      </span>
      <span className={styles.surahInfo}>
        <span className={styles.surahNameRow}>
          <span className={styles.surahNameEn}>{surah.nameEn}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.surahNameMeaning}>The {surah.nameEn.split('-').pop()}</span>
        </span>
        <span className={styles.surahMetaRow}>
          <span>{surah.revelationPlace}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{surah.ayahCount} ayahs</span>
          {bestScore !== null && (
            <>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.bestScore}>Best score {bestScore}</span>
            </>
          )}
        </span>
      </span>
      <span className={styles.surahArabic} lang="ar">
        {surah.nameAr}
      </span>
      <ChevronRightIcon className={styles.chevron} />
    </Link>
  );
}
