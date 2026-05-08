import Link from 'next/link';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AyahRecord, SurahSummary } from '../../lib/types';
import styles from '../../styles/practice.module.css';
import { ScoreDial } from './ScoreDial';
import { VerdictBlock } from './VerdictBlock';
import { SideStats } from './SideStats';
import { MetricCard } from './MetricCard';
import { WordByWord } from './WordByWord';
import { ListenBack } from './ListenBack';
import { ActionRow } from './ActionRow';
import { verdictForScore } from './verdict';

type Props = {
  job: ScoringResult;
  surah: SurahSummary;
  ayah: AyahRecord;
  totalAyahs: number;
  durationMs?: number | null;
  teacherAudioUrl?: string | null;
};

const toScoreOutOf100 = (raw: number | null | undefined): number | null => {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return null;
  return Math.round(raw * 100);
};

export function ResultDetail({ job, surah, ayah, totalAyahs, durationMs, teacherAudioUrl }: Props) {
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
      <div className={styles.topRow}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            Surah library
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link
            href={`/practice?surah=${surah.id}&ayah=${ayah.ayahNumber}`}
            className={styles.breadcrumbLink}
          >
            {surah.nameEn}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>Result · ayah {ayah.ayahNumber}</span>
        </nav>
      </div>

      <section className={styles.resultHero}>
        <div className={styles.resultHeroDial}>
          <ScoreDial score={score} />
        </div>
        <div className={styles.resultHeroBody}>
          <VerdictBlock verdict={verdict} />
          <SideStats surahId={surah.id} ayahNumber={ayah.ayahNumber} durationMs={durationMs} />
        </div>
      </section>

      <section className={styles.metricsRow}>
        <MetricCard
          label="Accuracy"
          value={feedback?.accuracy}
          description="How closely each phoneme matched"
        />
        <MetricCard
          label="Fluency"
          value={feedback?.fluency}
          description="Smoothness and rhythm of recitation"
        />
        <MetricCard
          label="Completeness"
          value={feedback?.completeness}
          description="How much of the ayah you recited"
        />
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
