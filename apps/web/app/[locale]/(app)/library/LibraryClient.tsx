'use client';

import { useMemo, useState } from 'react';
import type { SurahSummary } from '../../../lib/types';
import type { BffSuggestionResponse } from '../../../lib/classify';
import { countByRevelation, filterSurahs, type RevelationFilter } from '../../../lib/surahFilters';
import { SearchIcon } from '../../../components/icons/ArrowRightIcon';
import { ContinueCard } from './ContinueCard';
import { LibraryErrorState } from './LibraryErrorState';
import { SuggestedCard } from './SuggestedCard';
import { SurahGrid } from './SurahGrid';
import { css, cx } from '../../../../styled-system/css';
import { button } from '../../../../styled-system/recipes';

type Props = {
  surahs: SurahSummary[];
  // Personalised payload from the BFF (ADR 0015). `null` for guests and
  // BFF-failure modes; SuggestedCard falls back to the local heuristic.
  suggestion?: BffSuggestionResponse | null;
  // True when the server-side fetch for the surah list failed. The
  // Library is unusable without it, so we surface an explicit error
  // state instead of rendering an empty grid (which would be
  // indistinguishable from a filter mismatch).
  loadError?: boolean;
};

const SEARCH_MOBILE_MQ = '@media (max-width: 600px)';
const HERO_CARDS_MOBILE_MQ = '@media (max-width: 900px)';

const heroClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  marginBottom: '8',
  maxWidth: '[720px]'
});

const heroDescriptionClass = css({
  fontSize: '[17px]',
  color: 'ink.muted',
  maxWidth: '[540px]',
  lineHeight: '[1.55]'
});

const heroCardsClass = css({
  display: 'grid',
  gridTemplateColumns: '1.1fr 1fr',
  gap: '5',
  marginBottom: '8',
  [HERO_CARDS_MOBILE_MQ]: { gridTemplateColumns: '1fr' }
});

const searchRowClass = css({
  display: 'flex',
  gap: '3',
  alignItems: 'center',
  marginBottom: '6',
  flexWrap: 'wrap'
});

const searchBoxClass = css({
  flex: '1',
  minWidth: '[280px]',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'bg.paper',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  paddingBlock: '[0]',
  paddingInline: '5',
  height: '[52px]',
  boxShadow: 'card',
  [SEARCH_MOBILE_MQ]: { minWidth: '[0]', flex: '[1 1 200px]' }
});

const searchIconClass = css({
  color: 'ink.muted',
  marginRight: '3',
  flexShrink: 0
});

const searchInputClass = css({
  flex: '1',
  border: 'none',
  outline: 'none',
  backgroundColor: '[transparent]',
  fontSize: '[15px]',
  fontFamily: '[inherit]',
  color: 'ink.strong',
  '&::placeholder': { color: 'ink.muted' },
  [SEARCH_MOBILE_MQ]: { fontSize: '[14px]' }
});

const filterPillsClass = css({
  display: 'inline-flex',
  gap: '2',
  flexWrap: 'wrap',
  [SEARCH_MOBILE_MQ]: { gap: '1' }
});

// .pillBtnActive overrides .pillBtn's light surface with dark ink.
// Paired with button({tone:'nav'}) which already matches .pillBtn.
const pillActiveClass = css({
  backgroundColor: 'ink.strong',
  borderColor: 'ink.strong',
  color: 'bg.paper'
});

const FILTERS: { value: RevelationFilter; label: (count: number) => string }[] = [
  { value: 'all', label: (c) => `All ${c}` },
  { value: 'mecca', label: () => 'Mecca' },
  { value: 'medina', label: () => 'Medina' },
  { value: 'short', label: () => 'Short' }
];

export function LibraryClient({ surahs, suggestion = null, loadError = false }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RevelationFilter>('all');

  const counts = useMemo(() => countByRevelation(surahs), [surahs]);
  const filtered = useMemo(() => filterSurahs(surahs, query, filter), [surahs, query, filter]);

  if (loadError) {
    return (
      <>
        <header className={heroClass}>
          <h1>Choose a surah to recite</h1>
          <p className={heroDescriptionClass}>
            Listen to a teacher&apos;s recitation, then record your own. We&apos;ll score your
            pronunciation against the reference.
          </p>
        </header>
        <LibraryErrorState />
      </>
    );
  }

  return (
    <>
      <header className={heroClass}>
        <span className="eyebrow" aria-hidden="true">
          + Continue your practice
        </span>
        <h1>Choose a surah to recite</h1>
        <p className={heroDescriptionClass}>
          Listen to a teacher&apos;s recitation, then record your own. We&apos;ll score your
          pronunciation against the reference.
        </p>
      </header>

      <section className={heroCardsClass}>
        <ContinueCard surahs={surahs} />
        <SuggestedCard surahs={surahs} suggestion={suggestion} />
      </section>

      <section className={searchRowClass}>
        <div className={searchBoxClass}>
          <SearchIcon className={searchIconClass} />
          <input
            type="search"
            className={searchInputClass}
            placeholder="Search by surah name or number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search surahs"
          />
        </div>
        <div className={filterPillsClass} role="group" aria-label="Filter surahs">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = counts[f.value];
            const baseClass = button({ tone: 'nav', size: 'lg' });
            return (
              <button
                key={f.value}
                type="button"
                className={active ? cx(baseClass, pillActiveClass) : baseClass}
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
