import { css, cx } from '../../../styled-system/css';
import { panel } from '../../../styled-system/recipes';
import type { HistoryStats } from './historyStats';

type Props = {
  stats: HistoryStats;
};

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '3',
  marginBottom: '6'
});

const tileClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  padding: '5'
});

const eyebrowClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.08em]'
});

const eyebrowOnPaperClass = css({ color: 'ink.muted' });
const eyebrowOnContinueClass = css({ color: '[rgba(232, 217, 184, 0.65)]' });

const bigClass = css({
  fontFamily: 'serif',
  fontSize: '[34px]',
  lineHeight: '[1.1]',
  fontVariantNumeric: 'tabular-nums'
});

const bigOnPaperClass = css({ color: 'ink.strong' });
const bigOnContinueClass = css({ color: 'gold.onDark' });

const smallClass = css({
  fontSize: '[12px]',
  marginTop: '[2px]'
});

const smallOnPaperClass = css({ color: 'ink.muted' });
const smallOnContinueClass = css({ color: '[rgba(232, 217, 184, 0.65)]' });

// 2×2 summary tiles. Mirrors iOS `StatsGrid` (`Features/History/StatsGrid.swift`)
// in layout (this-week / average / best / streak) and emphasis (the
// Average tile uses the dark "continue" surface to call out the running
// average, matching the iOS design's inverse BrandCard treatment).
export function HistoryStatsGrid({ stats }: Props) {
  // `panel(...)` is a slot recipe: it returns an object with one class
  // per slot (root / body / title / …). We only need the outer surface
  // here, so pluck `.root` for each variant up front.
  const paperPanel = panel({ surface: 'paper' }).root;
  const continuePanel = panel({ surface: 'continue' }).root;

  return (
    <section className={gridClass} aria-label="Practice summary">
      <Tile
        eyebrow="This week"
        big={String(stats.thisWeekCount)}
        small="attempts"
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
      <Tile
        eyebrow="Average"
        big={stats.averageScore === null ? '—' : String(Math.round(stats.averageScore))}
        small="of 100"
        panelClass={continuePanel}
        eyebrowClassName={eyebrowOnContinueClass}
        bigClassName={bigOnContinueClass}
        smallClassName={smallOnContinueClass}
      />
      <Tile
        eyebrow="Best"
        big={stats.bestScore === null ? '—' : String(Math.round(stats.bestScore))}
        small={stats.bestSurah ?? '—'}
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
      <Tile
        eyebrow="Streak"
        big={String(stats.streakDays)}
        small="days"
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
    </section>
  );
}

type TileProps = {
  eyebrow: string;
  big: string;
  small: string;
  panelClass: string;
  eyebrowClassName: string;
  bigClassName: string;
  smallClassName: string;
};

function Tile({
  eyebrow,
  big,
  small,
  panelClass,
  eyebrowClassName,
  bigClassName,
  smallClassName
}: TileProps) {
  return (
    <div className={cx(panelClass, tileClass)}>
      <span className={cx(eyebrowClass, eyebrowClassName)}>{eyebrow}</span>
      <span className={cx(bigClass, bigClassName)}>{big}</span>
      <span className={cx(smallClass, smallClassName)}>{small}</span>
    </div>
  );
}
