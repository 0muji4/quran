'use client';

import { useTranslations } from 'next-intl';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';
import type { HistoryStats } from './historyStats';

interface Props {
  stats: HistoryStats;
}

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
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

// 1×4 summary tiles (this-week / average / best / streak). The Average
// tile uses the dark "continue" surface to call out the running average,
// matching iOS `StatsGrid`'s inverse BrandCard treatment.
export function HistoryStatsGrid({ stats }: Props) {
  const t = useTranslations('history.stats');
  // `panel(...)` is a slot recipe: it returns an object with one class
  // per slot (root / body / title / …). We only need the outer surface
  // here, so pluck `.root` for each variant up front.
  const paperPanel = panel({ surface: 'paper' }).root;
  const continuePanel = panel({ surface: 'continue' }).root;
  const unknown = t('bestUnknown');

  return (
    <section className={gridClass} aria-label={t('ariaLabel')}>
      <Tile
        eyebrow={t('thisWeek')}
        big={String(stats.thisWeekCount)}
        small={t('thisWeekUnit')}
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
      <Tile
        eyebrow={t('average')}
        big={stats.averageScore === null ? unknown : String(Math.round(stats.averageScore))}
        small={t('averageUnit')}
        panelClass={continuePanel}
        eyebrowClassName={eyebrowOnContinueClass}
        bigClassName={bigOnContinueClass}
        smallClassName={smallOnContinueClass}
      />
      <Tile
        eyebrow={t('best')}
        big={stats.bestScore === null ? unknown : String(Math.round(stats.bestScore))}
        small={stats.bestSurah ?? unknown}
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
      <Tile
        eyebrow={t('streak')}
        big={String(stats.streakDays)}
        small={t('streakUnit')}
        panelClass={paperPanel}
        eyebrowClassName={eyebrowOnPaperClass}
        bigClassName={bigOnPaperClass}
        smallClassName={smallOnPaperClass}
      />
    </section>
  );
}

interface TileProps {
  eyebrow: string;
  big: string;
  small: string;
  panelClass: string;
  eyebrowClassName: string;
  bigClassName: string;
  smallClassName: string;
}

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
