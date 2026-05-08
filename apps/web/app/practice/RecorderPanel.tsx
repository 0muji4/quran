'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '../hooks/useRecorder';
import { useScoringJob } from '../hooks/useScoringJob';
import { MicIcon, StopIcon } from '../components/icons/MediaIcons';
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

export function RecorderPanel({ surah, ayah, onRecordingStart }: Props) {
  const recorder = useRecorder();
  const job = useScoringJob();
  const router = useRouter();
  const [lastBest, setLastBest] = useState<{ score: number; achievedAt: string } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah.id, ayah.ayahNumber]);

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
      const params = new URLSearchParams({
        surah: surah.id,
        ayah: String(ayah.ayahNumber)
      });
      router.push(`/practice/result/${job.job.jobId}?${params.toString()}`);
    }
  }, [job.stage, job.job, surah.id, surah.nameEn, ayah.ayahNumber, router]);

  const stage = job.stage; // 'idle' | 'uploading' | 'scoring' | 'done' | 'error'
  const isRecording = recorder.isRecording;
  // Treat the brief 'done' window as still-busy: we navigate to the result
  // route in the same effect, so the mic card stays in scoring presentation
  // until the redirect completes.
  const isPendingNavigation = stage === 'done' && job.job?.status === 'COMPLETED';
  const isDarkPanel =
    isRecording || stage === 'uploading' || stage === 'scoring' || isPendingNavigation;

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

  const handleMicClick = isRecording ? handleStop : handleStart;
  const recordingError = recorder.error ? ERROR_COPY[recorder.error] : null;

  const panelClass = isDarkPanel ? `${styles.panel} ${styles.panelDark}` : styles.panel;
  const titleIconClass = isRecording
    ? `${styles.panelIcon} ${styles.panelIconRed}`
    : `${styles.panelIcon} ${styles.panelIconTan}`;
  const headerSubtitle = isRecording
    ? 'Speak clearly into your microphone'
    : stage === 'uploading'
      ? 'Uploading your recording…'
      : stage === 'scoring' || isPendingNavigation
        ? 'Scoring in progress'
        : stage === 'error'
          ? 'Something went wrong'
          : 'Press the button when ready';
  const headerTitle = isRecording ? 'Recording…' : 'Now you recite';

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
      </div>

      <div className={styles.recorderInner}>
        {(isRecording || stage === 'idle' || stage === 'error') && (
          <RecorderBars live={isRecording} levels={recorder.levels} />
        )}

        {(stage === 'uploading' || stage === 'scoring' || isPendingNavigation) && (
          <div className={styles.spinner} aria-hidden="true" />
        )}

        {(stage === 'idle' || stage === 'error' || isRecording) && (
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
              disabled={stage === 'uploading' || stage === 'scoring' || isPendingNavigation}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <StopIcon size={22} /> : <MicIcon size={28} />}
            </button>
          </div>
        )}
        <p className={styles.recorderCaption}>
          {isRecording
            ? 'Tap to stop and submit for scoring'
            : stage === 'uploading'
              ? 'Uploading…'
              : stage === 'scoring' || isPendingNavigation
                ? 'Scoring your recitation…'
                : stage === 'error'
                  ? 'Tap the mic to try again'
                  : 'Tap the mic to begin'}
        </p>
      </div>

      {recordingError && <p className="status error">{recordingError}</p>}
      {!recordingError && job.error && <p className="status error">{job.error}</p>}

      {!isRecording && stage === 'idle' && lastBest && (
        <p className={styles.recorderFooter}>
          Last attempt: <span className={styles.lastScore}>{lastBest.score} / 100</span>
        </p>
      )}
    </div>
  );
}
