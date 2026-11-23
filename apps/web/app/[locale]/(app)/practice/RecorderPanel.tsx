'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../../i18n/navigation';
import { useStoredValue } from '../../../hooks/useLocalStorageState';
import { useRecorder } from '../../../hooks/useRecorder';
import { trackUiEvent } from '../../../telemetry/use-ui-event';
import { useScoringJob } from '../../../hooks/useScoringJob';
import { MicIcon, StopIcon } from '../../../components/icons/MediaIcons';
import { AnalysingCard } from './AnalysingCard';
import { RecorderBars } from './RecorderBars';
import { ScoringErrorCard } from './ScoringErrorCard';
import { recorderStatusMessage } from './recorderStatus';
import { notifyRecordingStarted } from './recordingEvents';
import { formatPracticedAt } from '../../../lib/classify';
import {
  getRecentAttempts,
  recordAttempt,
  recordBestScore,
  setLastPracticed,
  type Attempt
} from '../../../lib/storage';
import type { AyahRecord, SurahSummary } from '../../../lib/types';
import { css, cx } from '../../../../styled-system/css';
import { appButton, appCard, appFab } from '../../../../styled-system/recipes';

// Render with a `key` per ayah: navigating between ayahs relies on the remount
// to drop the recording, the scoring job, and the panel state.
interface Props {
  surah: SurahSummary;
  ayah: AyahRecord;
}

const formatElapsed = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

type DeviceErrorKey = 'unsupported' | 'denied' | 'failed';

// Soft threshold for the scoring/uploading wait. The poll itself does not
// stop — the worker may still finish — but at 30s we surface an explicit
// "Cancel and try again" escape so the user is never left wondering.
const STUCK_HINT_AT_MS = 30_000;

// Recordings shorter than this are skipped client-side; the BFF would refuse
// them anyway and this avoids a network round-trip plus surfaces a precise
// reason ("Recording was 0.6 s — too short to score").
const MIN_RECORDING_MS = 1_000;

const findLastScoredAttempt = (surahId: string, ayahNumber: number): Attempt | null =>
  getRecentAttempts().find(
    (a) =>
      a.surahId === surahId &&
      a.ayahNumber === ayahNumber &&
      a.status === 'COMPLETED' &&
      typeof a.score === 'number'
  ) ?? null;

export function RecorderPanel({ surah, ayah }: Props) {
  const recorder = useRecorder();
  const job = useScoringJob();
  const router = useRouter();
  const t = useTranslations('practice.recorder');
  const liveStatusT = useTranslations('practice.recorder.liveStatus');
  const scoringErrorT = useTranslations('practice.scoringError');
  // The footer ("Last attempt: N / 100") reflects the most recent
  // completed scoring for this ayah, refreshed on mount and after each
  // new attempt lands.
  const [lastAttempt, refreshLastAttempt] = useStoredValue(
    () => findLastScoredAttempt(surah.id, ayah.ayahNumber),
    null
  );
  const [scoringElapsedMs, setScoringElapsedMs] = useState(0);
  const [elapsedStage, setElapsedStage] = useState(job.stage);
  const [tooShortReason, setTooShortReason] = useState<string | null>(null);
  // Retained so the user can replay their attempt from the error card. Cleared
  // on a fresh start and on the auto-redirect to the result page.
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  // Captured at the moment of stop. useRecorder resets elapsedMs to 0 once
  // the recorder finalizes, so we snapshot before invoking stop.
  const lastDurationMsRef = useRef<number | null>(null);
  const navigatedJobIdRef = useRef<string | null>(null);

  // Track time spent in the upload/scoring window so AnalysingCard can advance
  // its checklist and the stuck-cancel CTA can appear at 30s. The ticker only
  // runs while the panel is busy and resets on every stage change.
  if (job.stage !== elapsedStage) {
    setElapsedStage(job.stage);
    setScoringElapsedMs(0);
  }

  useEffect(() => {
    const isBusy = job.stage === 'uploading' || job.stage === 'scoring';
    if (!isBusy) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      setScoringElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [job.stage]);

  // Persist best score + attempt log when scoring completes, then auto-navigate
  // to the dedicated result route. We do not render an inline done UI any more;
  // the result page is the single canonical place for detailed feedback.
  useEffect(() => {
    if (job.stage !== 'done' && job.stage !== 'error') return;
    if (!job.job) return;
    const completed = job.job.status === 'COMPLETED';
    const score =
      completed && typeof job.job.score === 'number' ? Math.round(job.job.score * 100) : null;

    if (completed && score !== null) {
      recordBestScore(surah.id, ayah.ayahNumber, score);
    }

    const attempt: Attempt = {
      id: job.job.jobId,
      surahId: surah.id,
      surahNameEn: surah.nameEn,
      ayahNumber: ayah.ayahNumber,
      score,
      jobId: job.job.jobId,
      createdAt: new Date().toISOString(),
      status: completed ? 'COMPLETED' : 'FAILED',
      durationMs: lastDurationMsRef.current ?? undefined
    };
    recordAttempt(attempt);
    if (completed && score !== null) {
      // Re-read so the footer does not stay frozen on the mount-time
      // read until the user navigates ayahs.
      refreshLastAttempt();
    }

    if (completed && navigatedJobIdRef.current !== job.job.jobId) {
      navigatedJobIdRef.current = job.job.jobId;
      setLastBlob(null);
      router.push(`/practice/${surah.id}/${ayah.ayahNumber}/result/${job.job.jobId}`);
    }
  }, [job.stage, job.job, surah.id, surah.nameEn, ayah.ayahNumber, router, refreshLastAttempt]);

  const stage = job.stage; // 'idle' | 'uploading' | 'scoring' | 'done' | 'error'
  const isRecording = recorder.isRecording;
  // Treat the brief 'done' window as still-busy: we navigate to the result
  // route in the same effect, so the mic card stays in scoring presentation
  // until the redirect completes.
  const isPendingNavigation = stage === 'done' && job.job?.status === 'COMPLETED';
  const isAnalysing = stage === 'uploading' || stage === 'scoring' || isPendingNavigation;
  const isStuck = isAnalysing && scoringElapsedMs >= STUCK_HINT_AT_MS;
  const recordingError = recorder.error ? t(`device.${recorder.error as DeviceErrorKey}`) : null;
  // Could-not-score branch: scoring API/poll surfaced an error, OR we caught
  // a too-short recording client-side. Mic-permission failures
  // (recordingError) stay in their own banner since the remediation is
  // different (browser-level permission grant rather than re-recording).
  const isScoringError = !recordingError && (stage === 'error' || tooShortReason !== null);
  const handleStart = useCallback(async () => {
    setTooShortReason(null);
    setLastBlob(null);
    job.reset();
    navigatedJobIdRef.current = null;
    setLastPracticed({
      surahId: surah.id,
      ayahNumber: ayah.ayahNumber,
      surahNameEn: surah.nameEn,
      surahNameAr: surah.nameAr,
      ayahCount: surah.ayahCount,
      practicedAt: new Date().toISOString()
    });
    notifyRecordingStarted();
    trackUiEvent('web.ui.recording_started', {
      surahId: surah.id,
      ayahNumber: ayah.ayahNumber
    });
    await recorder.start();
  }, [job, recorder, surah.id, surah.nameEn, surah.nameAr, surah.ayahCount, ayah.ayahNumber]);

  const handleStop = useCallback(async () => {
    const elapsedAtStop = recorder.elapsedMs;
    lastDurationMsRef.current = elapsedAtStop;
    const blob = await recorder.stop();
    if (!blob) return;
    setLastBlob(blob);
    trackUiEvent('web.ui.recording_stopped', {
      surahId: surah.id,
      ayahNumber: ayah.ayahNumber,
      durationMs: Math.round(elapsedAtStop),
      tooShort: elapsedAtStop < MIN_RECORDING_MS
    });
    if (elapsedAtStop < MIN_RECORDING_MS) {
      const seconds = (elapsedAtStop / 1000).toFixed(1);
      setTooShortReason(t('tooShort', { seconds }));
      return;
    }
    await job.submit({ blob, surahId: surah.id, ayahNumber: ayah.ayahNumber });
  }, [recorder, job, surah.id, ayah.ayahNumber, t]);

  // Bail out of a long-running scoring job. The job may still finish on the
  // worker, but the panel returns to idle so the user can record again.
  const handleCancelScoring = useCallback(() => {
    trackUiEvent('web.ui.recording_cancelled', {
      surahId: surah.id,
      ayahNumber: ayah.ayahNumber
    });
    job.reset();
    recorder.cancel();
    lastDurationMsRef.current = null;
    setLastBlob(null);
    navigatedJobIdRef.current = null;
    setScoringElapsedMs(0);
    setTooShortReason(null);
  }, [job, recorder, surah.id, ayah.ayahNumber]);

  const handleReplay = useCallback(() => {
    if (!lastBlob) return;
    const url = URL.createObjectURL(lastBlob);
    const audio = new Audio(url);
    const release = () => URL.revokeObjectURL(url);
    audio.addEventListener('ended', release);
    audio.addEventListener('error', release);
    void audio.play().catch(release);
  }, [lastBlob]);

  const handleRecordAgain = useCallback(() => {
    void handleStart();
  }, [handleStart]);

  const handleMicClick = isRecording ? handleStop : handleStart;

  // Recording again closer to the mic cannot help here, so the panel
  // explains the limit in the header and drops the hearing hints.
  const limitReached = isScoringError && job.failure === 'limit_reached';
  const headerTitle = isRecording
    ? t('headerRecordingTitle')
    : isAnalysing
      ? t('headerAnalysingTitle')
      : limitReached
        ? scoringErrorT('limitReachedTitle')
        : isScoringError
          ? t('headerErrorTitle')
          : t('headerIdleTitle');
  const headerSubtitle = isRecording
    ? t('headerRecordingSubtitle')
    : isAnalysing
      ? isStuck
        ? t('headerAnalysingStuckSubtitle')
        : t('headerAnalysingSubtitle')
      : limitReached
        ? null
        : isScoringError
          ? t('headerErrorSubtitle')
          : t('headerIdleSubtitle');

  const errorReasons: string[] = [];
  if (tooShortReason) errorReasons.push(tooShortReason);
  if (limitReached) errorReasons.push(scoringErrorT('limitReachedTitle'));

  const liveStatus = recorderStatusMessage(
    {
      recordingError,
      isScoringError,
      errorReasons,
      isStuck,
      isAnalysing,
      isRecording
    },
    (key, values) => liveStatusT(key, values)
  );

  const isIdle = !isRecording && !isAnalysing && !isScoringError;

  return (
    <section
      className={cx(panelClass, isScoringError ? errorPanelClass : null)}
      aria-labelledby="recorder-title"
    >
      <div role="status" aria-live="polite" className={srOnlyClass}>
        {liveStatus}
      </div>
      <div className={headClass}>
        <h2 id="recorder-title" className={titleClass}>
          {headerTitle}
        </h2>
        {isRecording && (
          <span className={timerClass} data-testid="recording-timer">
            <span className={timerDotClass} aria-hidden="true" />
            {formatElapsed(recorder.elapsedMs)}
          </span>
        )}
      </div>
      {headerSubtitle && (
        <p className={cx(subtitleClass, isScoringError ? onErrorClass : null)}>{headerSubtitle}</p>
      )}

      {isAnalysing ? (
        <>
          <AnalysingCard elapsedMs={scoringElapsedMs} />
          {isStuck ? (
            <button
              type="button"
              className={cx(appButton({ variant: 'text' }), css({ alignSelf: 'center' }))}
              onClick={handleCancelScoring}
            >
              {t('cancel')}
            </button>
          ) : null}
        </>
      ) : isScoringError ? (
        <ScoringErrorCard
          reasons={limitReached ? [] : errorReasons}
          hint={limitReached ? scoringErrorT('limitReachedHint') : undefined}
          canReplay={lastBlob !== null && !limitReached}
          onReplay={handleReplay}
          onRecordAgain={handleRecordAgain}
        />
      ) : (
        <div className={recorderClass}>
          {isRecording && <RecorderBars levels={recorder.levels} />}
          <button
            type="button"
            className={appFab({ tone: isRecording ? 'error' : 'primary' })}
            onClick={handleMicClick}
            aria-label={isRecording ? t('ariaStop') : t('ariaStart')}
          >
            {isRecording ? <StopIcon size={30} /> : <MicIcon size={36} />}
          </button>
          <p className={captionClass}>{isRecording ? t('captionRecording') : t('captionIdle')}</p>
        </div>
      )}

      {recordingError && (
        <p className={deviceErrorClass} role="alert">
          {recordingError}
        </p>
      )}

      {isIdle && stage === 'idle' && lastAttempt && lastAttempt.score !== null && (
        // `data-testid` lets the visual-regression idle scene mask this
        // line: `when` is a relative time ("yesterday", "2 days ago") that
        // drifts daily and would otherwise make the baseline flaky.
        <p className={captionClass} data-testid="last-attempt">
          {t.rich('lastAttempt', {
            score: lastAttempt.score,
            when: formatPracticedAt(lastAttempt.createdAt),
            span: (chunks) => <span className={lastScoreClass}>{chunks}</span>
          })}
        </p>
      )}
    </section>
  );
}

const panelClass = cx(
  appCard({ variant: 'filled' }),
  css({ display: 'flex', flexDirection: 'column', gap: '1', padding: '4' })
);

const errorPanelClass = css({ background: 'errorContainer', color: 'onErrorContainer' });

const headClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '2'
});

const titleClass = css({ margin: '0', textStyle: 'titleMedium', color: '[inherit]' });

const subtitleClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const onErrorClass = css({ color: 'onErrorContainer' });

const timerClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2',
  textStyle: 'labelLarge',
  color: 'recording',
  fontVariantNumeric: 'tabular-nums'
});

const timerDotClass = css({
  width: '[8px]',
  height: '[8px]',
  borderRadius: 'full',
  background: 'recording'
});

const recorderClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3',
  paddingTop: '3'
});

const captionClass = css({
  margin: '0',
  textAlign: 'center',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

const lastScoreClass = css({ fontWeight: 500, color: 'onSurface' });

const deviceErrorClass = css({
  margin: '0',
  paddingTop: '2',
  textStyle: 'bodyMedium',
  color: 'error'
});

const srOnlyClass = css({ srOnly: true });
