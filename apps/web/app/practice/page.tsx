import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchSurahAyahs, fetchSurahs } from '../actions';
import type { AyahRecord, SurahSummary } from '../lib/types';
import { AyahDisplayCard } from './AyahDisplayCard';
import { AyahProgressDots } from './AyahProgressDots';
import { PracticeClient } from './PracticeClient';
import { ArrowLeftIcon, ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import styles from '../styles/practice.module.css';

type SearchParams = {
  surah?: string;
  ayah?: string;
};

export default async function PracticePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const surahId = params.surah ?? '1';
  const requestedAyah = Number(params.ayah ?? '1');

  // Tolerate transient BFF errors (e.g. 4xx for an unknown surah, or BFF
  // not yet ready) by treating them like a missing surah and redirecting
  // back to the library.
  let surahs: SurahSummary[] = [];
  let ayahs: AyahRecord[] = [];
  try {
    [surahs, ayahs] = await Promise.all([fetchSurahs(), fetchSurahAyahs(surahId)]);
  } catch {
    redirect('/');
  }
  const surah = surahs.find((s) => s.id === surahId);

  if (!surah || ayahs.length === 0) {
    redirect('/');
  }

  const ayahNumber = Number.isFinite(requestedAyah) && requestedAyah > 0 ? requestedAyah : 1;
  const selectedAyah = ayahs.find((a) => a.ayahNumber === ayahNumber) ?? ayahs[0];
  const currentAyah = selectedAyah.ayahNumber;
  const totalAyahs = ayahs.length;
  const prevAyah = currentAyah > 1 ? currentAyah - 1 : null;
  const nextAyah = currentAyah < totalAyahs ? currentAyah + 1 : null;

  return (
    <>
      <div className={styles.topRow}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            Surah library
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{surah.nameEn}</span>
          <span className={styles.breadcrumbSep}>·</span>
          <span>The {surah.nameEn.split('-').pop()}</span>
        </nav>
        <AyahProgressDots total={totalAyahs} current={currentAyah} />
      </div>

      <AyahDisplayCard ayah={selectedAyah} surahNameEn={surah.nameEn} />

      <PracticeClient surah={surah} ayah={selectedAyah} />

      <div className={styles.navRow}>
        {prevAyah !== null ? (
          <Link href={`/practice?surah=${surahId}&ayah=${prevAyah}`} className={styles.navBtn}>
            <ArrowLeftIcon /> Previous ayah
          </Link>
        ) : (
          <span className={`${styles.navBtn} ${styles.navBtnDisabled}`} aria-disabled="true">
            <ArrowLeftIcon /> Previous ayah
          </span>
        )}

        <p className={styles.navTip}>Tip: tap the mic to record, tap again to stop and submit.</p>

        {nextAyah !== null ? (
          <Link href={`/practice?surah=${surahId}&ayah=${nextAyah}`} className={styles.navBtn}>
            Next ayah <ArrowRightIcon />
          </Link>
        ) : (
          <span className={`${styles.navBtn} ${styles.navBtnDisabled}`} aria-disabled="true">
            Next ayah <ArrowRightIcon />
          </span>
        )}
      </div>
    </>
  );
}
