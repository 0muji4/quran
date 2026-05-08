'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import styles from '../../styles/practice.module.css';

type Props = {
  surahId: string;
  surahName: string;
  ayahNumber: number;
  totalAyahs: number;
};

const CONFIRMATION_MS = 2_000;

export function ActionRow({ surahId, surahName, ayahNumber, totalAyahs }: Props) {
  const tryAgainHref = `/practice/${surahId}/${ayahNumber}`;
  const isLastAyah = ayahNumber >= totalAyahs;
  // On the final ayah, route home with a hint so the library page can show a
  // celebration toast. Encoding the surah name keeps the toast self-contained
  // without re-fetching the surah list to look up a display string.
  const continueHref = isLastAyah
    ? `/?completed=${encodeURIComponent(surahName)}`
    : `/practice/${surahId}/${ayahNumber + 1}`;
  const continueLabel = isLastAyah ? 'Finish surah' : `Continue to ayah ${ayahNumber + 1}`;

  // The attempt is already persisted by recordAttempt() the moment scoring
  // completes (see RecorderPanel). This button acknowledges that — clicking
  // it surfaces a brief "Saved to history ✓" so the user sees they don't have
  // to do anything to keep the result. When Phase 3.1 adds BFF persistence,
  // this is the natural place to upgrade to a real sync trigger.
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!confirmed) return;
    const id = setTimeout(() => setConfirmed(false), CONFIRMATION_MS);
    return () => clearTimeout(id);
  }, [confirmed]);

  return (
    <div className={styles.resultActionRow}>
      <Link href={tryAgainHref} className={styles.btnGhost}>
        <ArrowLeftIcon /> Try this ayah again
      </Link>
      <button
        type="button"
        className={`${styles.btnGhost} ${styles.saveAttemptBtn}`}
        onClick={() => setConfirmed(true)}
        aria-live="polite"
      >
        {confirmed ? (
          <>
            <CheckGlyph /> Saved to history
          </>
        ) : (
          'Save attempt'
        )}
      </button>
      <Link href={continueHref} className={`${styles.btnTeal} ${styles.resultPrimaryBtn}`}>
        {continueLabel} <ArrowRightIcon />
      </Link>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.2 5 8.5l4.5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
