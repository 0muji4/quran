'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecentAttempts, type Attempt } from '../../lib/storage';
import { formatPracticedAt } from '../../lib/classify';
import { ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import styles from '../../styles/history.module.css';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

type Props = {
  signedIn: boolean;
};

export function HistoryList({ signedIn }: Props) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    setAttempts(getRecentAttempts());
  }, []);

  if (!signedIn) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Sign in to track your practice</p>
        <p>
          Your attempts, best scores and continue-from progress sync across devices when you have an
          account.
        </p>
        <Link
          href="/sign-in"
          className={styles.statusPill + ' ' + styles.statusPillCompleted}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Sign in <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  if (attempts === null) {
    return null; // first paint, before localStorage hydrate
  }

  if (attempts.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No attempts yet</p>
        <p>Your recent recitation scores will appear here once you start practicing.</p>
        <Link
          href="/"
          className={styles.statusPill + ' ' + styles.statusPillCompleted}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Browse the surah library <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {attempts.map((a) => {
        const completed = a.status === 'COMPLETED';
        return (
          <li key={a.id} className={styles.listItem}>
            <Link href={`/practice/${a.surahId}/${a.ayahNumber}`} className={styles.row}>
              <span
                className={completed ? styles.score : `${styles.score} ${styles.scoreFailed}`}
                aria-label={completed ? `Score ${a.score}` : 'Failed attempt'}
              >
                {completed && a.score !== null ? a.score : '—'}
              </span>
              <div className={styles.info}>
                <p className={styles.title}>
                  {a.surahNameEn} · ayah {a.ayahNumber}
                </p>
                <p className={styles.meta}>
                  {formatDate(a.createdAt)} · {formatPracticedAt(a.createdAt)}
                </p>
              </div>
              <span
                className={
                  completed
                    ? `${styles.statusPill} ${styles.statusPillCompleted}`
                    : `${styles.statusPill} ${styles.statusPillFailed}`
                }
              >
                {completed ? 'Completed' : 'Failed'}
              </span>
              <ArrowRightIcon size={14} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
