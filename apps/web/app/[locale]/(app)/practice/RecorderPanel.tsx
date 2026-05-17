'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../../i18n/navigation';
import { useRecorder } from '../../../hooks/useRecorder';
import { trackUiEvent } from '../../../telemetry/use-ui-event';
import { useScoringJob } from '../../../hooks/useScoringJob';
import { MicIcon, StopIcon } from '../../../components/icons/MediaIcons';
import { AnalysingCard } from './AnalysingCard';
import { RecorderBars } from './RecorderBars';
import { ScoringErrorCard } from './ScoringErrorCard';
import { recorderStatusMessage } from './recorderStatus';
import { notifyRecordingStarted } from './recordingEvents';
import {
  getRecentAttempts,
  recordAttempt,
  recordBestScore,
  setLastPracticed,
  type Attempt
} from '../../../lib/storage';
import type { AyahRecord, SurahSummary } from '../../../lib/types';
import styles from '../../../styles/practice.module.css';

type Props = {
  surah: SurahSummary;
  ayah: AyahRecord;
};

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

export function RecorderPanel({ surah, ayah }: Props) {
  const recorder = useRecorder();
  const job = useScoringJob();
  const router = useRouter();
  const t = useTranslations('practice.recorder');
  const liveStatusT = useTranslations('practice.recorder.liveStatus');
  // The footer ("Last attempt: N / 100") reflects the most recent
  // completed scoring for this ayah, refreshed on mount, on ayah
  // navigation, and after each new attempt lands.
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [scoringElapsedMs, setScoringElapsedMs] = useState(0);
  const [tooShortReason, setTooShortReason] = useState<string | null>(null);

  // Captured at the moment of stop. useRecorder resets elapsedMs to 0 once
  // the recorder finalizes, so we snapshot before invoking stop.
  const lastDurationMsRef = useRef<number | null>(null);
  // Retained so the user can replay their attempt from the error card. Cleared
  // on a fresh start, on ayah navigation, and on the auto-redirect to the
  // result page.
  const lastBlobRef = useRef<Blob | null>(null);
  const navigatedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const match = getRecentAttempts().find(
      (a) =>
        a.surahId === surah.id &&
        a.ayahNumber === ayah.ayahNumber &&
        a.status === 'COMPLETED' &&
        typeof a.score === 'number'
    );
    setLastAttempt(match ?? null);
  }, [surah.id, ayah.ayahNumber]);

  // Reset state when navigating ayahs.
  useEffect(() => {
    job.reset();
    recorder.cancel();
    lastDurationMsRef.current = null;
    lastBlobRef.current = null;
    navigatedJobIdRef.current = null;
    setScoringElapsedMs(0);
    setTooShortReason(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah.id, ayah.ayahNumber]);

  // Track time spent in the upload/scoring window so AnalysingCard can advance
  // its checklist and the stuck-cancel CTA can appear at 30s. The ticker only
  // runs while the panel is busy and resets each time the user re-enters that
  // window.
  useEffect(() => {
    const isBusy = job.stage === 'uploading' || job.stage === 'scoring';
    if (!isBusy) {
      setScoringElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    setScoringElapsedMs(0);
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
      // Promote the in-memory snapshot too — otherwise the footer
      // stays frozen on the mount-time read until the user
      // navigates ayahs.
      setLastAttempt(attempt);
    }

    if (completed && navigatedJobIdRef.current !== job.job.jobId) {
      navigatedJobIdRef.current = job.job.jobId;
      lastBlobRef.current = null;
      router.push(`/practice/${surah.id}/${ayah.ayahNumber}/result/${job.job.jobId}`);
    }
  }, [job.stage, job.job, surah.id, surah.nameEn, ayah.ayahNumber, router]);

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
  // Only the live-recording state uses the dark panel chrome; the analysing
  // and error states stay on the cream paper background per the redesigned
  // mockups (docs/4. Practice _ analysing.png, 4b. Practice _ error _could
  // not score_.png).
  const isDarkPanel = isRecording;

  const handleStart = useCallback(async () => {
    setTooShortReason(null);
    lastBlobRef.current = null;
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
    lastBlobRef.current = blob;
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
    lastBlobRef.current = null;
    navigatedJobIdRef.current = null;
    setScoringElapsedMs(0);
    setTooShortReason(null);
  }, [job, recorder, surah.id, ayah.ayahNumber]);

  const handleReplay = useCallback(() => {
    const blob = lastBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const release = () => URL.revokeObjectURL(url);
    audio.addEventListener('ended', release);
    audio.addEventListener('error', release);
    void audio.play().catch(release);
  }, []);

  const handleRecordAgain = useCallback(() => {
    void handleStart();
  }, [handleStart]);

  const handleMicClick = isRecording ? handleStop : handleStart;

  const panelClass = isDarkPanel ? `${styles.panel} ${styles.panelDark}` : styles.panel;
  const titleIconClass =
    isRecording || isScoringError
      ? `${styles.panelIcon} ${styles.panelIconRed}`
      : isAnalysing
        ? `${styles.panelIcon} ${styles.panelIconTeal}`
        : `${styles.panelIcon} ${styles.panelIconTan}`;

  const headerTitle = isRecording
    ? t('headerRecordingTitle')
    : isAnalysing
      ? t('headerAnalysingTitle')
      : isScoringError
        ? t('headerErrorTitle')
        : t('headerIdleTitle');
  const headerSubtitle = isRecording
    ? t('headerRecordingSubtitle')
    : isAnalysing
      ? isStuck
        ? t('headerAnalysingStuckSubtitle')
        : t('headerAnalysingSubtitle')
      : isScoringError
        ? t('headerErrorSubtitle')
        : t('headerIdleSubtitle');

  const errorReasons: string[] = [];
  if (tooShortReason) errorReasons.push(tooShortReason);
  if (stage === 'error' && job.error) errorReasons.push(job.error);

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

  return (
    <div className={panelClass}>
      <div role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </div>
      <div className={styles.panelHead}>
        <div className={styles.panelTitleRow}>
          <span className={titleIconClass}>
            <MicIcon size={18} />
          </span>
          <div>
            <h2 className={styles.panelTitle}>{headerTitle}</h2>
            <p className={styles.panelSubtitle}>{headerSubtitle}</p>
          </div>
        </div>
        {isRecording && (
          <span className={styles.recordingTimer}>
            <span className={styles.recordingTimerDot} aria-hidden="true" />
            {formatElapsed(recorder.elapsedMs)}
          </span>
        )}
        {isAnalysing && (
          <span className={styles.scoringBadge}>
            <span className={styles.scoringBadgeDot} aria-hidden="true" />
            {t('badgeScoring')}
          </span>
        )}
        {isScoringError && <span className={styles.errorBadge}>{t('badgeCouldntProcess')}</span>}
      </div>

      <div className={styles.recorderInner}>
        {isAnalysing ? (
          <>
            <AnalysingCard elapsedMs={scoringElapsedMs} />
            {isStuck ? (
              <button type="button" className={styles.recorderCancel} onClick={handleCancelScoring}>
                {t('cancel')}
              </button>
            ) : null}
          </>
        ) : isScoringError ? (
          <ScoringErrorCard
            reasons={errorReasons}
            canReplay={!!lastBlobRef.current}
            onReplay={handleReplay}
            onRecordAgain={handleRecordAgain}
          />
        ) : (
          <>
            <RecorderBars live={isRecording} levels={recorder.levels} />
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {isRecording && (
                <>
                  <span className={styles.pulseRing} />
                  <span className={styles.pulseRing} />
                  <span className={styles.pulseRing} />
                </>
              )}
              <button
                type="button"
                className={
                  isRecording ? `${styles.micButton} ${styles.micButtonStop}` : styles.micButton
                }
                onClick={handleMicClick}
                aria-label={isRecording ? t('ariaStop') : t('ariaStart')}
              >
                {isRecording ? <StopIcon size={22} /> : <MicIcon size={28} />}
              </button>
            </div>
            <p className={styles.recorderCaption}>
              {isRecording ? t('captionRecording') : t('captionIdle')}
            </p>
          </>
        )}
      </div>

      {recordingError && <p className="status error">{recordingError}</p>}

      {!isRecording &&
        !isScoringError &&
        stage === 'idle' &&
        lastAttempt &&
        lastAttempt.score !== null && (
          <p className={styles.recorderFooter}>
            {t.rich('lastAttempt', {
              score: lastAttempt.score,
              span: (chunks) => <span className={styles.lastScore}>{chunks}</span>
            })}
          </p>
        )}
    </div>
  );
}
