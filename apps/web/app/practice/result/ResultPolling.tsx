'use client';

import { useEffect, useState } from 'react';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AyahRecord, SurahSummary } from '../../lib/types';
import { fetchScoringJob } from '../../actions';
import { ResultDetail } from './ResultDetail';
import { ResultError } from './ResultError';
import styles from '../../styles/practice.module.css';

type Props = {
  initialJob: ScoringResult;
  surah: SurahSummary;
  ayah: AyahRecord;
  totalAyahs: number;
  teacherAudioUrl?: string | null;
};

const POLL_INTERVAL_MS = 2000;

// Client wrapper that keeps the page alive while a scoring job is QUEUED or
// RUNNING. We never render the detailed UI with partial data: we only swap to
// ResultDetail (or ResultError) once the job hits a terminal status.
export function ResultPolling({ initialJob, surah, ayah, totalAyahs, teacherAudioUrl }: Props) {
  const [job, setJob] = useState<ScoringResult>(initialJob);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job.status === 'COMPLETED' || job.status === 'FAILED') return;

    let cancelled = false;
    const tick = async () => {
      try {
        const next = await fetchScoringJob(job.jobId);
        if (cancelled) return;
        setJob(next);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Polling failed');
      }
    };

    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [job.jobId, job.status]);

  if (error) {
    return <ResultError surah={surah} ayah={ayah} message={error} />;
  }

  if (job.status === 'COMPLETED') {
    return (
      <ResultDetail
        job={job}
        surah={surah}
        ayah={ayah}
        totalAyahs={totalAyahs}
        teacherAudioUrl={teacherAudioUrl}
      />
    );
  }

  if (job.status === 'FAILED') {
    return (
      <ResultError
        surah={surah}
        ayah={ayah}
        message={job.verdict ?? 'Scoring failed. Please try again.'}
      />
    );
  }

  return (
    <section className={styles.resultPending} aria-live="polite" aria-busy="true">
      <div className={styles.resultPendingSpinner} aria-hidden="true" />
      <h2 className={styles.resultPendingTitle}>Scoring your recitation…</h2>
      <p className={styles.resultPendingSubtitle}>
        Hang tight — your detailed feedback will appear shortly.
      </p>
    </section>
  );
}
