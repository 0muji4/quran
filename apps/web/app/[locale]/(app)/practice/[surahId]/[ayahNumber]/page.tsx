import { getLocale, getTranslations } from 'next-intl/server';
import { Link, redirect } from '../../../../../../i18n/navigation';
import { fetchSurahAyahs, fetchSurahs } from '../../../../../actions';
import type { AyahRecord, SurahSummary } from '../../../../../lib/types';
import { AyahDisplayCard } from '../../AyahDisplayCard';
import { AyahProgressDots } from '../../AyahProgressDots';
import { RecorderPanel } from '../../RecorderPanel';
import { TeacherPanel } from '../../TeacherPanel';
import { ArrowLeftIcon, ArrowRightIcon } from '../../../../../components/icons/ArrowRightIcon';
import styles from '../../../../../styles/practice.module.css';

type RouteParams = {
  surahId: string;
  ayahNumber: string;
};

export default async function PracticePage({ params }: { params: Promise<RouteParams> }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('practice.page')]);
  const { surahId, ayahNumber: ayahNumberRaw } = await params;
  const requestedAyah = Number(ayahNumberRaw);

  // Tolerate transient BFF errors (e.g. 4xx for an unknown surah, or BFF
  // not yet ready) by treating them like a missing surah and redirecting
  // back to the library.
  let surahs: SurahSummary[] = [];
  let ayahs: AyahRecord[] = [];
  try {
    [surahs, ayahs] = await Promise.all([fetchSurahs(), fetchSurahAyahs(surahId)]);
  } catch {
    redirect({ href: '/', locale });
  }
  const surah = surahs.find((s) => s.id === surahId);

  if (!surah || ayahs.length === 0) {
    redirect({ href: '/', locale });
  }

  const ayahNumber = Number.isFinite(requestedAyah) && requestedAyah > 0 ? requestedAyah : 1;
  const selectedAyah = ayahs.find((a) => a.ayahNumber === ayahNumber) ?? ayahs[0];
  const currentAyah = selectedAyah.ayahNumber;
  const totalAyahs = ayahs.length;
  const prevAyah = currentAyah > 1 ? currentAyah - 1 : null;
  const nextAyah = currentAyah < totalAyahs ? currentAyah + 1 : null;
  const meaning = surah.nameEn.split('-').pop() ?? surah.nameEn;

  return (
    <>
      {/* Visually hidden page-level h1. Screen readers announce it on
       * navigation; sighted users have the breadcrumb + ayah card. The
       * only consumer of this is axe's `page-has-heading-one` rule and
       * the heading-hierarchy contract; visible chrome stays unchanged. */}
      <h1 className="sr-only">
        {t('h1', { surahName: surah.nameEn, ayah: currentAyah, total: totalAyahs })}
      </h1>
      <div className={styles.topRow}>
        <nav className={styles.breadcrumb} aria-label={t('breadcrumbAriaLabel')}>
          <Link href="/" className={styles.breadcrumbLink}>
            {t('breadcrumbLibrary')}
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ›
          </span>
          <span className={styles.breadcrumbCurrent} aria-current="page">
            {surah.nameEn}
          </span>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ·
          </span>
          <span>{t('breadcrumbThe', { meaning })}</span>
        </nav>
        <AyahProgressDots total={totalAyahs} current={currentAyah} />
      </div>

      <AyahDisplayCard ayah={selectedAyah} surahNameEn={surah.nameEn} />

      <div className={styles.panels}>
        <TeacherPanel surahId={Number(surah.id)} ayahNumber={selectedAyah.ayahNumber} />
        <RecorderPanel surah={surah} ayah={selectedAyah} />
      </div>

      <div className={styles.navRow}>
        {prevAyah !== null ? (
          <Link href={`/practice/${surahId}/${prevAyah}`} className={styles.navBtn}>
            <ArrowLeftIcon /> {t('prev')}
          </Link>
        ) : (
          <span className={`${styles.navBtn} ${styles.navBtnDisabled}`} aria-disabled="true">
            <ArrowLeftIcon /> {t('prev')}
          </span>
        )}

        <p className={styles.navTip}>{t('tip')}</p>

        {nextAyah !== null ? (
          <Link href={`/practice/${surahId}/${nextAyah}`} className={styles.navBtn}>
            {t('next')} <ArrowRightIcon />
          </Link>
        ) : (
          <span className={`${styles.navBtn} ${styles.navBtnDisabled}`} aria-disabled="true">
            {t('next')} <ArrowRightIcon />
          </span>
        )}
      </div>
    </>
  );
}
