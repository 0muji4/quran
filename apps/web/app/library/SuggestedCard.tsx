'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { SurahSummary } from '../lib/types';
import { getLastPracticed } from '../lib/storage';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { difficultyOf, pickSuggestion } from '../lib/classify';
import { ArrowRightIcon, PlusIcon } from '../components/icons/ArrowRightIcon';
import styles from '../styles/library.module.css';

type Props = {
  surahs: SurahSummary[];
};

const blurbFor = (surah: SurahSummary): string => {
  if (surah.ayahCount <= 5) {
    return `Short surah · ${surah.ayahCount} ayahs · ~90 seconds. A great warm-up before longer practice.`;
  }
  if (surah.ayahCount <= 15) {
    return `${surah.ayahCount} ayahs · perfect for a focused practice session.`;
  }
  return `${surah.ayahCount} ayahs · build endurance with regular reading.`;
};

export function SuggestedCard({ surahs }: Props) {
  const [last] = useLocalStorageState(getLastPracticed, null);
  const suggestion = useMemo(() => pickSuggestion(surahs, last), [surahs, last]);

  if (!suggestion) {
    return null;
  }

  const difficulty = difficultyOf(suggestion);

  return (
    <div className={styles.suggested}>
      <span className={styles.suggestedBadge}>
        <PlusIcon /> Suggested for you
      </span>
      <h2 className={styles.suggestedTitle}>{suggestion.nameEn}</h2>
      <p className={styles.suggestedDesc}>{blurbFor(suggestion)}</p>
      <div className={styles.suggestedFooter}>
        <span className={styles.suggestedMeta}>
          <span>{suggestion.ayahCount} ayahs</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{suggestion.revelationPlace}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{difficulty}</span>
        </span>
        <Link className={styles.linkTeal} href={`/practice?surah=${suggestion.id}&ayah=1`}>
          Begin <ArrowRightIcon size={14} />
        </Link>
      </div>
    </div>
  );
}
