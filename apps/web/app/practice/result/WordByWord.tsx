import type { WordAlignment } from '@quran-project/shared-ts';
import styles from '../../styles/practice.module.css';

type Props = {
  wordAlignments: WordAlignment[];
  wer: number | null | undefined;
};

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
    <section className={styles.wordCompareSection}>
      <header className={styles.wordCompareHead}>
        <div>
          <h3 className={styles.wordCompareTitle}>Word-by-word comparison</h3>
          <p className={styles.wordCompareSubtitle}>
            Word Error Rate (WER) <span className={styles.wordCompareWer}>{formatWer(wer)}</span>
          </p>
        </div>
        <ul className={styles.wordCompareLegend} aria-label="Legend">
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotMatch}`} aria-hidden="true" />
            Match
          </li>
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotSub}`} aria-hidden="true" />
            Substitution
          </li>
          <li>
            <span className={`${styles.legendDot} ${styles.legendDotMissing}`} aria-hidden="true" />
            Missing
          </li>
        </ul>
      </header>

      {!hasAlignments ? (
        <p className={styles.wordCompareEmpty}>
          Word-level alignment is not available for this attempt yet. Try recording again to surface
          a word-by-word breakdown.
        </p>
      ) : (
        <>
          <div className={styles.wordCompareRow}>
            <span className={styles.wordCompareRowLabel}>EXPECTED (TEACHER)</span>
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
            <span className={styles.wordCompareRowLabel}>WHAT WE HEARD</span>
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
