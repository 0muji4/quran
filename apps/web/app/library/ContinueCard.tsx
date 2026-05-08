'use client';

import Link from 'next/link';
import type { SurahSummary } from '../lib/types';
import { getLastPracticed } from '../lib/storage';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { ArrowRightIcon, BookmarkIcon } from '../components/icons/ArrowRightIcon';
import styles from '../styles/library.module.css';

type Props = {
  surahs: SurahSummary[];
};

const COMPASS_SVG = (
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.8">
    <circle cx="100" cy="100" r="95" />
    <circle cx="100" cy="100" r="70" />
    <circle cx="100" cy="100" r="45" />
    <line x1="100" y1="0" x2="100" y2="200" />
    <line x1="0" y1="100" x2="200" y2="100" />
    <line x1="29.3" y1="29.3" x2="170.7" y2="170.7" />
    <line x1="170.7" y1="29.3" x2="29.3" y2="170.7" />
  </svg>
);

export function ContinueCard({ surahs }: Props) {
  const [last] = useLocalStorageState(getLastPracticed, null);

  if (!last) {
    return (
      <div className={styles.continue}>
        <div className={styles.continueOrnament}>{COMPASS_SVG}</div>
        <span className={styles.continueBadge}>
          <BookmarkIcon /> Get started
        </span>
        <div className={styles.continueBody}>
          <h2 className={styles.continueTitle}>Begin your tilawah</h2>
          <p className={styles.continueMeta}>
            Pick any surah from the library below to record your first ayah.
          </p>
        </div>
        <div className={styles.continueActions}>
          <Link className={styles.btnGold} href={`/practice?surah=${surahs[0]?.id ?? '1'}&ayah=1`}>
            <ArrowRightIcon /> Start practice
          </Link>
        </div>
      </div>
    );
  }

  const surah = surahs.find((s) => s.id === last.surahId);
  const surahNameAr = surah?.nameAr ?? last.surahNameAr;
  const surahNameEn = surah?.nameEn ?? last.surahNameEn;
  const ayahCount = surah?.ayahCount ?? last.ayahCount;
  const progress =
    ayahCount > 0 ? Math.min(100, Math.round((last.ayahNumber / ayahCount) * 100)) : 0;

  return (
    <div className={styles.continue}>
      <div className={styles.continueOrnament}>{COMPASS_SVG}</div>
      <span className={styles.continueBadge}>
        <BookmarkIcon /> Continue
      </span>
      <div className={styles.continueBody}>
        <div className={styles.continueRow}>
          <span className={styles.continueArabic} lang="ar">
            {surahNameAr}
          </span>
          <span className={styles.continueTitle}>{surahNameEn}</span>
        </div>
        <p className={styles.continueMeta}>
          Ayah {last.ayahNumber} of {ayahCount} · last practiced{' '}
          {new Date(last.practicedAt).toLocaleDateString()}
        </p>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className={styles.continueActions}>
        <Link
          className={styles.btnGold}
          href={`/practice?surah=${last.surahId}&ayah=${last.ayahNumber}`}
        >
          <ArrowRightIcon /> Resume ayah {last.ayahNumber}
        </Link>
        <Link className={styles.btnGhostDark} href={`/practice?surah=${last.surahId}&ayah=1`}>
          Start over
        </Link>
      </div>
    </div>
  );
}
