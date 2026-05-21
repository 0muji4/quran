'use client';

import { useTranslations } from 'next-intl';
import type { WordAlignment } from '@quran-project/shared-ts';
import styles from '../../../../styles/practice.module.css';

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

const tileClass = (cat: TileCategory): string => {
  switch (cat) {
    case 'match':
      return `${styles.wordTile} ${styles.wordTileMatch}`;
    case 'substitution':
      return `${styles.wordTile} ${styles.wordTileSub}`;
    case 'missing':
      return `${styles.wordTile} ${styles.wordTileMissing}`;
    case 'inserted':
      return `${styles.wordTile} ${styles.wordTileInserted}`;
  }
};

const formatWer = (wer: number | null | undefined): string => {
  if (typeof wer !== 'number' || Number.isNaN(wer)) return '—';
  return `${(Math.max(0, wer) * 100).toFixed(1)}%`;
};

export function WordByWord({ wordAlignments, wer }: Props) {
  const t = useTranslations('result.words');
  const hasAlignments = wordAlignments.length > 0;
  const expectedRow = wordAlignments.map((a, i) => ({
    key: `exp-${i}`,
    word: a.refWord ?? null,
    cat: categoryFor(a.op),
    isPlaceholder: a.refWord == null
  }));
  const heardRow = wordAlignments.map((a, i) => ({
    key: `hyp-${i}`,
    word: a.hypWord ?? null,
    cat: categoryFor(a.op),
    isPlaceholder: a.hypWord == null
  }));

  return (
    <section className={styles.wordCompareSection} aria-labelledby="word-compare-heading">
      <header className={styles.wordCompareHead}>
        <div>
          <h2 id="word-compare-heading" className={styles.wordCompareTitle}>
            {t('title')}
          </h2>
          <p className={styles.wordCompareSubtitle}>
            {t('werLabel')} <span className={styles.wordCompareWer}>{formatWer(wer)}</span>
          </p>
        </div>
        <ul className={styles.wordCompareLegend} aria-label={t('legendAriaLabel')}>
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotMatch}`} aria-hidden="true" />
            {t('legend.match')}
          </li>
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotSub}`} aria-hidden="true" />
            {t('legend.substitution')}
          </li>
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotMissing}`} aria-hidden="true" />
            {t('legend.missing')}
          </li>
        </ul>
      </header>

      {!hasAlignments ? (
        <p className={styles.wordCompareEmpty}>{t('empty')}</p>
      ) : (
        <>
          <div className={styles.wordCompareRow}>
            <span className={styles.wordCompareRowLabel}>{t('rowExpected')}</span>
            <div className={styles.wordCompareTiles} dir="rtl">
              {expectedRow.map((tile) => (
                <span
                  key={tile.key}
                  className={tileClass(tile.cat)}
                  lang="ar"
                  aria-hidden={tile.isPlaceholder || undefined}
                >
                  {tile.word ?? '…'}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.wordCompareRow}>
            <span className={styles.wordCompareRowLabel}>{t('rowHeard')}</span>
            <div className={styles.wordCompareTiles} dir="rtl">
              {heardRow.map((tile) => (
                <span
                  key={tile.key}
                  className={tileClass(tile.cat)}
                  lang="ar"
                  aria-hidden={tile.isPlaceholder || undefined}
                >
                  {tile.word ?? '…'}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
