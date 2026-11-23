import { getTranslations } from 'next-intl/server';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AyahRecord, SurahSummary } from '../../../../lib/types';
import { css, cx } from '../../../../../styled-system/css';
import { appCard } from '../../../../../styled-system/recipes';
import { ScoreDial } from './ScoreDial';
import { VerdictBlock } from './VerdictBlock';
import { SideStats } from './SideStats';
import { MetricCard } from './MetricCard';
import { WordByWord } from './WordByWord';
import { ListenBack } from './ListenBack';
import { ActionRow } from './ActionRow';
import { ResultViewedTracker } from './ResultViewedTracker';
import { ResultFrame, fullRowClass } from './ResultFrame';
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

// The page's main card: the score dial beside the verdict and the stats.
const heroClass = cx(
  appCard({ variant: 'elevated' }),
  fullRowClass,
  css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4',
    padding: '4',
    medium: { gap: '8', padding: '6' }
  })
);

const heroBodyClass = css({
  flex: '[1 1 260px]',
  minWidth: '[0]',
  display: 'flex',
  flexDirection: 'column',
  gap: '2'
});

const metricsClass = cx(
  fullRowClass,
  css({
    display: 'grid',
    gap: '3',
    medium: { gridTemplateColumns: '[repeat(3, minmax(0, 1fr))]', gap: '4' }
  })
);

export async function ResultDetail({
  job,
  surah,
  ayah,
  totalAyahs,
  durationMs,
  teacherAudioUrl
}: Props) {
  const t = await getTranslations('result');
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
    <ResultFrame surahId={surah.id} surahName={surah.nameEn} ayahNumber={ayah.ayahNumber}>
      <ResultViewedTracker surahId={surah.id} ayahNumber={ayah.ayahNumber} score={score} />

      <section className={heroClass} aria-label={t('heroAriaLabel')}>
        <ScoreDial score={score} />
        <div className={heroBodyClass}>
          <VerdictBlock verdict={verdict} />
          <SideStats surahId={surah.id} ayahNumber={ayah.ayahNumber} durationMs={durationMs} />
        </div>
      </section>

      <section className={metricsClass} aria-label={t('metricsAriaLabel')}>
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
    </ResultFrame>
  );
}
