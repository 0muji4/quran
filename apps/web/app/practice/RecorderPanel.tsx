'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '../hooks/useRecorder';
import { useScoringJob } from '../hooks/useScoringJob';
import { MicIcon, StopIcon } from '../components/icons/MediaIcons';
import { AnalysingCard } from './AnalysingCard';
import { RecorderBars } from './RecorderBars';
import {
  getBestScore,
  recordAttempt,
  recordBestScore,
  setLastPracticed,
  type Attempt
} from '../lib/storage';
import type { AyahRecord, SurahSummary } from '../lib/types';
import styles from '../styles/practice.module.css';

type Props = {
  surah: SurahSummary;
  ayah: AyahRecord;
  onRecordingStart?: () => void;
};

const formatElapsed = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ERROR_COPY: Record<string, string> = {
  unsupported: 'Recording is not supported in this browser.',
  denied: 'Microphone access was denied. Please grant permission and try again.',
  failed: 'Could not start the recorder. Please try again.'
};

// Soft threshold for the scoring/uploading wait. The poll itself does not
// stop — the worker may still finish — but at 30s we surface an explicit
// "Cancel and try again" escape so the user is never left wondering.
const STUCK_HINT_AT_MS = 30_000;

export function RecorderPanel({ surah, ayah, onRecordingStart }: Props) {
  const recorder = useRecorder();
  const job = useScoringJob();
  const router = useRouter();
  const [lastBest, setLastBest] = useState<{ score: number; achievedAt: string } | null>(null);
  const [scoringElapsedMs, setScoringElapsedMs] = useState(0);

  // Captured at the moment of stop. useRecorder resets elapsedMs to 0 once
  // the recorder finalizes, so we snapshot before invoking stop.
  const lastDurationMsRef = useRef<number | null>(null);
  const navigatedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLastBest(getBestScore(surah.id, ayah.ayahNumber));
  }, [surah.id, ayah.ayahNumber]);

  // Reset state when navigating ayahs.
  useEffect(() => {
    job.reset();
    recorder.cancel();
    lastDurationMsRef.current = null;
    navigatedJobIdRef.current = null;
    setScoringElapsedMs(0);
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

    if (completed && navigatedJobIdRef.current !== job.job.jobId) {
      navigatedJobIdRef.current = job.job.jobId;
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
  // Only the live-recording state uses the dark panel chrome; the analysing
  // state stays on the cream paper background per the redesigned mockup
  // (docs/4. Practice _ analysing.png).
  const isDarkPanel = isRecording;

  const handleStart = useCallback(async () => {
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
    onRecordingStart?.();
    await recorder.start();
  }, [
    job,
    recorder,
    surah.id,
    surah.nameEn,
    surah.nameAr,
    surah.ayahCount,
    ayah.ayahNumber,
    onRecordingStart
  ]);

  const handleStop = useCallback(async () => {
    lastDurationMsRef.current = recorder.elapsedMs;
    const blob = await recorder.stop();
    if (!blob) return;
    await job.submit({ blob, surahId: surah.id, ayahNumber: ayah.ayahNumber });
  }, [recorder, job, surah.id, ayah.ayahNumber]);

  // Bail out of a long-running scoring job. The job may still finish on the
  // worker, but the panel returns to idle so the user can record again.
  const handleCancelScoring = useCallback(() => {
    job.reset();
    recorder.cancel();
    lastDurationMsRef.current = null;
    navigatedJobIdRef.current = null;
    setScoringElapsedMs(0);
  }, [job, recorder]);

  const handleMicClick = isRecording ? handleStop : handleStart;
  const recordingError = recorder.error ? ERROR_COPY[recorder.error] : null;

  const panelClass = isDarkPanel ? `${styles.panel} ${styles.panelDark}` : styles.panel;
  const titleIconClass = isRecording
    ? `${styles.panelIcon} ${styles.panelIconRed}`
    : isAnalysing
      ? `${styles.panelIcon} ${styles.panelIconTeal}`
      : `${styles.panelIcon} ${styles.panelIconTan}`;

  const headerTitle = isRecording
    ? 'Recording…'
    : isAnalysing
      ? 'Analysing your recitation…'
      : 'Now you recite';
  const headerSubtitle = isRecording
    ? 'Speak clearly into your microphone'
    : isAnalysing
      ? isStuck
        ? 'Taking longer than usual'
        : 'Comparing against the teacher reference'
      : stage === 'error'
        ? 'Something went wrong'
        : 'Press the button when ready';

  return (
    <div className={panelClass}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitleRow}>
          <span className={titleIconClass}>
            <MicIcon size={18} />
          </span>
          <div>
            <h3 className={styles.panelTitle}>{headerTitle}</h3>
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
            Scoring
          </span>
        )}
      </div>

      <div className={styles.recorderInner}>
        {isAnalysing ? (
          <>
            <AnalysingCard elapsedMs={scoringElapsedMs} />
            {isStuck ? (
              <button type="button" className={styles.recorderCancel} onClick={handleCancelScoring}>
                Cancel and try again
              </button>
            ) : null}
          </>
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
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <StopIcon size={22} /> : <MicIcon size={28} />}
              </button>
            </div>
            <p className={styles.recorderCaption}>
              {isRecording
                ? 'Tap to stop and submit for scoring'
                : stage === 'error'
                  ? 'Tap the mic to try again'
                  : 'Tap the mic to begin'}
            </p>
          </>
        )}
      </div>

      {recordingError && <p className="status error">{recordingError}</p>}
      {!recordingError && job.error && stage === 'error' && (
        <p className="status error">{job.error}</p>
      )}

      {!isRecording && stage === 'idle' && lastBest && (
        <p className={styles.recorderFooter}>
          Last attempt: <span className={styles.lastScore}>{lastBest.score} / 100</span>
        </p>
      )}
    </div>
  );
}
