'use client';

import { useMemo, useState } from 'react';
import type { SurahSummary } from '../lib/types';
import { countByRevelation, filterSurahs, type RevelationFilter } from '../lib/surahFilters';
import { SearchIcon } from '../components/icons/ArrowRightIcon';
import { ContinueCard } from './ContinueCard';
import { SuggestedCard } from './SuggestedCard';
import { SurahGrid } from './SurahGrid';
import styles from '../styles/library.module.css';

type Props = {
  surahs: SurahSummary[];
};

const FILTERS: { value: RevelationFilter; label: (count: number) => string }[] = [
  { value: 'all', label: (c) => `All ${c}` },
  { value: 'mecca', label: () => 'Mecca' },
  { value: 'medina', label: () => 'Medina' },
  { value: 'short', label: () => 'Short' }
];

export function LibraryClient({ surahs }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RevelationFilter>('all');

  const counts = useMemo(() => countByRevelation(surahs), [surahs]);
  const filtered = useMemo(() => filterSurahs(surahs, query, filter), [surahs, query, filter]);

  return (
    <>
      <header className={styles.hero}>
        <span className="eyebrow" aria-hidden="true">
          + Continue your practice
        </span>
        <h1>Choose a surah to recite</h1>
        <p className={styles.heroDescription}>
          Listen to a teacher&apos;s recitation, then record your own. We&apos;ll score your
          pronunciation against the reference.
        </p>
      </header>

      <section className={styles.heroCards}>
        <ContinueCard surahs={surahs} />
        <SuggestedCard surahs={surahs} />
      </section>

      <section className={styles.searchRow}>
        <div className={styles.searchBox}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by surah name or number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search surahs"
          />
        </div>
        <div className={styles.filterPills} role="group" aria-label="Filter surahs">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = counts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                className={active ? `${styles.pillBtn} ${styles.pillBtnActive}` : styles.pillBtn}
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
              >
                {f.label(count)}
              </button>
            );
          })}
        </div>
      </section>

      <SurahGrid surahs={filtered} />
    </>
  );
}
