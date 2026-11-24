'use client';

import { useTranslations } from 'next-intl';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import type { SurahSummary } from '../../../lib/types';
import { getBestScores, getLastPracticed } from '../../../lib/storage';
import { SearchIcon } from '../../../components/icons/ArrowRightIcon';
import { SurahRow } from './SurahRow';
import { css } from '../../../../styled-system/css';

interface Props {
  surahs: SurahSummary[];
}

interface Snapshot {
  bestScores: Record<string, number>; // surahId → max best across ayahs (rounded to int)
  lastPracticedSurahId: string | null;
}

const EMPTY_SNAPSHOT: Snapshot = { bestScores: {}, lastPracticedSurahId: null };

// One column, and two in expanded windows. The rows' padding reaches into the
// page's gutter, so their content lines up with the cards above.
const listClass = css({
  listStyle: 'none',
  margin: '0',
  marginInline: '[-16px]',
  padding: '0',
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  columnGap: '4',
  expanded: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' }
});

const emptyClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2',
  paddingBlock: '12',
  textAlign: 'center',
  color: 'onSurfaceVariant'
});

const emptyTitleClass = css({ margin: '0', textStyle: 'titleMedium', color: 'onSurface' });

const emptyBodyClass = css({ margin: '0', textStyle: 'bodyMedium' });

const buildSnapshot = (): Snapshot => {
  const all = getBestScores();
  const bestPerSurah: Record<string, number> = {};
  for (const [k, v] of Object.entries(all)) {
    const [surahId] = k.split(':');
    const score = Math.round(v.score);
    if (!(surahId in bestPerSurah) || score > bestPerSurah[surahId]) {
      bestPerSurah[surahId] = score;
    }
  }
  return {
    bestScores: bestPerSurah,
    lastPracticedSurahId: getLastPracticed()?.surahId ?? null
  };
};

export function SurahGrid({ surahs }: Props) {
  const [snapshot] = useLocalStorageState(buildSnapshot, EMPTY_SNAPSHOT);
  const t = useTranslations('library.empty');

  if (surahs.length === 0) {
    return (
      <div className={emptyClass}>
        <SearchIcon size={40} />
        <p className={emptyTitleClass}>{t('title')}</p>
        <p className={emptyBodyClass}>{t('body')}</p>
      </div>
    );
  }

  return (
    <ul className={listClass}>
      {surahs.map((surah) => (
        <li key={surah.id}>
          <SurahRow
            surah={surah}
            bestScore={snapshot.bestScores[surah.id] ?? null}
            isLastPracticed={snapshot.lastPracticedSurahId === surah.id}
          />
        </li>
      ))}
    </ul>
  );
}
