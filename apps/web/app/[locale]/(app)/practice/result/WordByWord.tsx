'use client';

import { useTranslations } from 'next-intl';
import type { WordAlignment } from '@quran-project/shared-ts';
import { css, cx } from '../../../../../styled-system/css';
import { appCard } from '../../../../../styled-system/recipes';

interface Props {
  wordAlignments: WordAlignment[];
  wer: number | null | undefined;
}

type TileCategory = 'match' | 'substitution' | 'missing' | 'inserted';

// jiwer alignment ops: 'equal' / 'substitute' / 'delete' / 'insert'.
// We collapse ins/del into "missing/inserted" for display.
const categoryFor = (op: string): TileCategory => {
  const normalized = op.toLowerCase();
  if (normalized === 'equal' || normalized === 'match') return 'match';
  if (normalized === 'substitute' || normalized === 'sub' || normalized === 'replace')
    return 'substitution';
  if (normalized === 'delete' || normalized === 'del') return 'missing';
  if (normalized === 'insert' || normalized === 'ins') return 'inserted';
  return 'substitution';
};

const formatWer = (wer: number | null | undefined): string => {
  if (typeof wer !== 'number' || Number.isNaN(wer)) return '—';
  return `${(Math.max(0, wer) * 100).toFixed(1)}%`;
};

const sectionClass = cx(
  appCard({ variant: 'filled' }),
  css({ display: 'flex', flexDirection: 'column', gap: '3', padding: '4' })
);

const headClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '2'
});

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

const werClass = css({ margin: '0', textStyle: 'bodySmall', color: 'onSurfaceVariant' });

const tilesClass = css({ display: 'flex', flexWrap: 'wrap', gap: '2' });

// Each kind's colours, shared by the tiles and the legend swatches.
const kindStyles = {
  '&[data-kind=match]': { background: 'passContainer', color: 'onPassContainer' },
  '&[data-kind=substitution]': { background: 'warnContainer', color: 'onWarnContainer' },
  '&[data-kind=missing]': {
    background: 'transparent',
    color: 'onSurfaceVariant',
    borderWidth: '[1.5px]',
    borderStyle: 'dashed',
    borderColor: 'outline'
  },
  '&[data-kind=inserted]': { background: 'secondaryContainer', color: 'onSecondaryContainer' }
} as const;

// One tile per word of the teacher's text, as in the apps: what was heard
// in place of a word goes under it, and extra words get tiles of their own.
const tileClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: '[56px]',
  paddingInline: '3',
  paddingTop: '1',
  paddingBottom: '[6px]',
  borderRadius: 'small',
  ...kindStyles
});

const wordClass = css({
  fontFamily: 'quran',
  fontSize: '[1.375rem]',
  lineHeight: '[1.6]',
  '[data-kind=missing] > &': { textDecoration: 'line-through' }
});

const noteClass = css({ fontFamily: 'ui', textStyle: 'bodySmall' });

const legendClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '3',
  margin: '0',
  padding: '0',
  listStyle: 'none',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

const legendItemClass = css({ display: 'flex', alignItems: 'center', gap: '[6px]' });

const swatchClass = css({
  width: '[12px]',
  height: '[12px]',
  borderRadius: '[3px]',
  ...kindStyles
});

const bodyTextClass = css({ margin: '0', textStyle: 'bodySmall', color: 'onSurfaceVariant' });

const LEGEND: Array<[TileCategory, 'match' | 'substitution' | 'missing' | 'extra']> = [
  ['match', 'match'],
  ['substitution', 'substitution'],
  ['missing', 'missing'],
  ['inserted', 'extra']
];

export function WordByWord({ wordAlignments, wer }: Props) {
  const t = useTranslations('result.words');
  const tiles = wordAlignments.map((a, i) => {
    const kind = categoryFor(a.op);
    const word = kind === 'inserted' ? (a.hypWord ?? a.refWord) : (a.refWord ?? a.hypWord);
    let note: string | null = null;
    if (kind === 'substitution' && a.hypWord) note = t('heard', { word: a.hypWord });
    else if (kind === 'missing') note = t('legend.missing');
    else if (kind === 'inserted') note = t('legend.extra');
    return { key: `word-${i}`, kind, word: word ?? '…', note };
  });

  return (
    <section className={sectionClass} aria-labelledby="word-compare-heading">
      <div className={headClass}>
        <h2 id="word-compare-heading" className={titleClass}>
          {t('title')}
        </h2>
        <p className={werClass}>
          {t('werLabel')} <span>{formatWer(wer)}</span>
        </p>
      </div>

      {tiles.length === 0 ? (
        <p className={bodyTextClass}>{t('empty')}</p>
      ) : (
        <>
          <div className={tilesClass} dir="rtl">
            {tiles.map((tile) => (
              <span key={tile.key} className={tileClass} data-kind={tile.kind}>
                <span className={wordClass} lang="ar">
                  {tile.word}
                </span>
                {tile.note ? (
                  <span className={noteClass} dir="auto">
                    {tile.note}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <ul className={legendClass} aria-label={t('legendAriaLabel')}>
            {LEGEND.map(([kind, label]) => (
              <li key={kind} className={legendItemClass}>
                <span className={swatchClass} data-kind={kind} aria-hidden="true" />
                {t(`legend.${label}`)}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={bodyTextClass}>{t('note')}</p>
    </section>
  );
}
