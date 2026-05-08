'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ScoreSegment } from '@quran-project/shared-ts';
import { SegmentHighlights } from '@quran-project/ui';
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
  const [lastBest, setLastBest] = useState<{ score: number; achievedAt: string } | null>(null);

  useEffect(() => {
    setLastBest(getBestScore(surah.id, ayah.ayahNumber));
  }, [surah.id, ayah.ayahNumber]);

  // Reset state when navigating ayahs.
  useEffect(() => {
    job.reset();
    recorder.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah.id, ayah.ayahNumber]);

  // Persist best score + attempt log when scoring completes.
  useEffect(() => {
    if (job.stage !== 'done' && job.stage !== 'error') return;
    if (!job.job) return;
    const completed = job.job.status === 'COMPLETED';
    const score =
      completed && typeof job.job.score === 'number' ? Math.round(job.job.score * 100) : null;

    if (completed && score !== null) {
      recordBestScore(surah.id, ayah.ayahNumber, score);
      setLastBest({ score, achievedAt: new Date().toISOString() });
    }

    const attempt: Attempt = {
      id: job.job.jobId,
      surahId: surah.id,
      surahNameEn: surah.nameEn,
      ayahNumber: ayah.ayahNumber,
      score,
      jobId: job.job.jobId,
      createdAt: new Date().toISOString(),
      status: completed ? 'COMPLETED' : 'FAILED'
    };
    recordAttempt(attempt);
  }, [job.stage, job.job, surah.id, surah.nameEn, ayah.ayahNumber]);

  const stage = job.stage; // 'idle' | 'uploading' | 'scoring' | 'done' | 'error'
  const isRecording = recorder.isRecording;
  const isDarkPanel = isRecording || stage === 'uploading' || stage === 'scoring';

  const handleStart = useCallback(async () => {
    job.reset();
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
    const blob = await recorder.stop();
    if (!blob) return;
    await job.submit({ blob, surahId: surah.id, ayahNumber: ayah.ayahNumber });
  }, [recorder, job, surah.id, ayah.ayahNumber]);

  const handleMicClick = isRecording ? handleStop : handleStart;
  const recordingError = recorder.error ? ERROR_COPY[recorder.error] : null;

  const score =
    stage === 'done' && job.job?.status === 'COMPLETED' && typeof job.job.score === 'number'
      ? Math.round(job.job.score * 100)
      : null;

  const panelClass = isDarkPanel ? `${styles.panel} ${styles.panelDark}` : styles.panel;
  const titleIconClass = isRecording
    ? `${styles.panelIcon} ${styles.panelIconRed}`
    : `${styles.panelIcon} ${styles.panelIconTan}`;
  const headerSubtitle = isRecording
    ? 'Speak clearly into your microphone'
    : stage === 'uploading'
      ? 'Uploading your recording…'
      : stage === 'scoring'
        ? 'Scoring in progress'
        : stage === 'done'
          ? 'Great work — review your score'
          : stage === 'error'
            ? 'Something went wrong'
            : 'Press the button when ready';
  const headerTitle = isRecording
    ? 'Recording…'
    : stage === 'done'
      ? 'Your score'
      : 'Now you recite';

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

        {(stage === 'uploading' || stage === 'scoring') && (
          <div className={styles.spinner} aria-hidden="true" />
        )}

        {stage !== 'done' ? (
          <>
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
                  disabled={stage === 'uploading' || stage === 'scoring'}
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
                  : stage === 'scoring'
                    ? 'Scoring your recitation…'
                    : stage === 'error'
                      ? 'Tap the mic to try again'
                      : 'Tap the mic to begin'}
            </p>
          </>
        ) : (
          <div className={styles.scoreDisplay}>
            <span className={styles.scoreNumber}>
              {score ?? '—'}{' '}
              <span style={{ fontSize: 22, color: 'var(--color-ink-muted)' }}>/ 100</span>
            </span>
            <span className={styles.scoreLabel}>{job.job?.verdict ?? 'Recitation scored'}</span>
            <div className={styles.scoreActions}>
              <button type="button" className={styles.btnGhost} onClick={() => job.reset()}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {recordingError && <p className="status error">{recordingError}</p>}
      {!recordingError && job.error && <p className="status error">{job.error}</p>}

      {!isRecording && stage === 'idle' && lastBest && (
        <p className={styles.recorderFooter}>
          Last attempt: <span className={styles.lastScore}>{lastBest.score} / 100</span>
        </p>
      )}

      {stage === 'done' && job.segments.length > 0 && (
        <details className={styles.details}>
          <summary className={styles.detailsSummary}>View scoring details</summary>
          <ScoreDetails segments={job.segments} />
        </details>
      )}
    </div>
  );
}

function ScoreDetails({ segments }: { segments: ScoreSegment[] }) {
  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <SegmentHighlights segments={segments} threshold={0.85} />
    </div>
  );
}
