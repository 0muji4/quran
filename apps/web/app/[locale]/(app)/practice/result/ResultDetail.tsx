import { getTranslations } from 'next-intl/server';
import { Link } from '../../../../../i18n/navigation';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AyahRecord, SurahSummary } from '../../../../lib/types';
import styles from '../../../../styles/practice.module.css';
import { ScoreDial } from './ScoreDial';
import { VerdictBlock } from './VerdictBlock';
import { SideStats } from './SideStats';
import { MetricCard } from './MetricCard';
import { WordByWord } from './WordByWord';
import { ListenBack } from './ListenBack';
import { ActionRow } from './ActionRow';
import { ResultViewedTracker } from './ResultViewedTracker';
import { verdictForScore } from './verdict';

interface Props {
  job: ScoringResult;
  surah: SurahSummary;
  ayah: AyahRecord;
  totalAyahs: number;
  durationMs?: number | null;
  teacherAudioUrl?: string | null;
}

const toScoreOutOf100 = (raw: number | null | undefined): number | null => {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return null;
  return Math.round(raw * 100);
};

export async function ResultDetail({
  job,
  surah,
  ayah,
  totalAyahs,
  durationMs,
  teacherAudioUrl
}: Props) {
  const [t, navT] = await Promise.all([
    getTranslations('result'),
    getTranslations('practice.page')
  ]);
  const score = toScoreOutOf100(job.score ?? job.feedback?.overall);
  const verdict = verdictForScore(score);
  const feedback = job.feedback;
  // Prefer the BFF-supplied teacher URL when available (set by the result-page
  // server component via fetchReferenceAudioUrl). Fall back to whatever the
  // PronunciationFeedback carried, mainly for the freshly-created job path
  // before getScoringJob's hand-rolled response zeroes it out.
  const teacherUrl = teacherAudioUrl ?? feedback?.referenceAudioUrl ?? null;
  const userRecordingUrl = job.recordingUrl ?? null;

  return (
    <>
      <ResultViewedTracker surahId={surah.id} ayahNumber={ayah.ayahNumber} score={score} />
      <div className={styles.topRow}>
        <nav className={styles.breadcrumb} aria-label={navT('breadcrumbAriaLabel')}>
          <Link href="/" className={styles.breadcrumbLink}>
            {navT('breadcrumbLibrary')}
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ›
          </span>
          <Link href={`/practice/${surah.id}/${ayah.ayahNumber}`} className={styles.breadcrumbLink}>
            {surah.nameEn}
          </Link>
          <span className={styles.breadcrumbSep} aria-hidden="true">
            ›
          </span>
          <span className={styles.breadcrumbCurrent} aria-current="page">
            {t('breadcrumb', { ayah: ayah.ayahNumber })}
          </span>
        </nav>
      </div>

      <section className={styles.resultHero} aria-label={t('heroAriaLabel')}>
        <div className={styles.resultHeroDial}>
          <ScoreDial score={score} />
        </div>
        <div className={styles.resultHeroBody}>
          <VerdictBlock verdict={verdict} />
          <SideStats surahId={surah.id} ayahNumber={ayah.ayahNumber} durationMs={durationMs} />
        </div>
      </section>

      <section className={styles.metricsRow} aria-label={t('metricsAriaLabel')}>
        <MetricCard kind="accuracy" value={feedback?.accuracy} />
        <MetricCard
          kind="characterMatch"
          value={typeof feedback?.cer === 'number' ? 1 - feedback.cer : null}
        />
        <MetricCard kind="completeness" value={feedback?.completeness} />
      </section>

      <WordByWord wordAlignments={feedback?.wordAlignments ?? []} wer={feedback?.wer ?? null} />

      <ListenBack teacherUrl={teacherUrl} userRecordingUrl={userRecordingUrl} />

      <ActionRow
        surahId={surah.id}
        surahName={surah.nameEn}
        ayahNumber={ayah.ayahNumber}
        totalAyahs={totalAyahs}
      />
    </>
  );
}
