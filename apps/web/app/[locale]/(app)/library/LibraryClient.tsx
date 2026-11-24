'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SurahSummary } from '../../../lib/types';
import type { BffSuggestionResponse } from '../../../lib/classify';
import { countByRevelation, filterSurahs, type RevelationFilter } from '../../../lib/surahFilters';
import { PageFrame } from '../../../components/PageFrame';
import { CheckIcon, CloseIcon, SearchIcon } from '../../../components/icons/ArrowRightIcon';
import { ContinueCard } from './ContinueCard';
import { LibraryErrorState } from './LibraryErrorState';
import { SuggestedCard } from './SuggestedCard';
import { SurahGrid } from './SurahGrid';
import { css, cx } from '../../../../styled-system/css';
import { appChip, appIconButton } from '../../../../styled-system/recipes';

interface Props {
  surahs: SurahSummary[];
  // Personalised payload from the BFF (ADR 0015). `null` for guests and
  // BFF-failure modes; SuggestedCard falls back to the local heuristic.
  suggestion?: BffSuggestionResponse | null;
  // True when the server-side fetch for the surah list failed. The
  // Library is unusable without it, so we surface an explicit error
  // state instead of rendering an empty grid (which would be
  // indistinguishable from a filter mismatch).
  loadError?: boolean;
}

const cardsClass = css({
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  gap: '3',
  medium: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' }
});

// The search bar and the filter chips share a row where both fit.
const toolbarClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: '4',
  rowGap: '3'
});

// A Material 3 search bar. The field fills it, so the bar shows the field's
// keyboard focus.
const searchBarClass = css({
  flex: '[1 1 320px]',
  minWidth: '[0]',
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  minHeight: '[56px]',
  paddingInlineStart: '4',
  paddingInlineEnd: '1',
  borderRadius: 'full',
  background: 'surfaceContainerHigh',
  color: 'onSurfaceVariant',
  '&:has(input:focus-visible)': {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]'
  }
});

const searchIconClass = css({ flexShrink: 0 });

// The clear button below replaces the one some browsers draw.
const searchInputClass = css({
  flex: '1',
  minWidth: '[0]',
  height: '[56px]',
  border: 'none',
  outline: 'none',
  appearance: 'none',
  background: 'transparent',
  color: 'onSurface',
  textStyle: 'bodyLarge',
  textOverflow: 'ellipsis',
  _placeholder: { color: 'onSurfaceVariant', opacity: 1 },
  '&::-webkit-search-cancel-button': { display: 'none' }
});

const filtersClass = css({ display: 'flex', flexWrap: 'wrap', gap: '2' });

const filterChipClass = cx(appChip(), css({ _pressed: { paddingInlineStart: '2' } }));

const FILTER_VALUES: RevelationFilter[] = ['all', 'mecca', 'medina', 'short'];

export function LibraryClient({ surahs, suggestion = null, loadError = false }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RevelationFilter>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('library');

  const counts = useMemo(() => countByRevelation(surahs), [surahs]);
  const filtered = useMemo(() => filterSurahs(surahs, query, filter), [surahs, query, filter]);

  if (loadError) {
    return (
      <PageFrame title={t('title')}>
        <LibraryErrorState />
      </PageFrame>
    );
  }

  const clearSearch = () => {
    setQuery('');
    // The button leaves with the query, so focus goes back to the field.
    searchRef.current?.focus();
  };

  return (
    <PageFrame title={t('title')}>
      <section className={cardsClass}>
        <ContinueCard surahs={surahs} />
        <SuggestedCard surahs={surahs} suggestion={suggestion} />
      </section>

      <section className={toolbarClass}>
        <div className={searchBarClass}>
          <SearchIcon size={24} className={searchIconClass} />
          <input
            ref={searchRef}
            type="search"
            className={searchInputClass}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('searchAriaLabel')}
          />
          {query !== '' && (
            <button
              type="button"
              className={appIconButton({ variant: 'standard' })}
              onClick={clearSearch}
              aria-label={t('searchClearAriaLabel')}
            >
              <CloseIcon size={24} />
            </button>
          )}
        </div>
        <div className={filtersClass} role="group" aria-label={t('filterAriaLabel')}>
          {FILTER_VALUES.map((value) => {
            const active = filter === value;
            const label =
              value === 'all' ? t('filter.all', { count: counts.all }) : t(`filter.${value}`);
            return (
              <button
                key={value}
                type="button"
                className={filterChipClass}
                onClick={() => setFilter(value)}
                aria-pressed={active}
              >
                {active && <CheckIcon />}
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <SurahGrid surahs={filtered} />
    </PageFrame>
  );
}
