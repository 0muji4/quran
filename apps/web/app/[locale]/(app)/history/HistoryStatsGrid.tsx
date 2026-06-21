'use client';

import { useTranslations } from 'next-intl';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';
import type { HistoryStats, HistoryScope } from './historyStats';

interface Props {
  stats: HistoryStats;
  /** Count for the Attempts tile — scoped (this week) or total (lifetime). */
  attemptCount: number;
  scope: HistoryScope;
  onScopeChange: (scope: HistoryScope) => void;
}

const sectionWrapClass = css({ marginBottom: '6' });

const headRowClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '4',
  marginBottom: '3',
  flexWrap: 'wrap'
});

const progressLabelClass = css({
  fontSize: '[15px]',
  fontWeight: 600,
  color: 'ink.strong'
});

// Segmented "This week / Lifetime" range control.
const toggleClass = css({
  display: 'inline-flex',
  backgroundColor: 'bg.page',
  borderRadius: 'pill',
  padding: '[3px]',
  gap: '[2px]'
});
const toggleBtnClass = css({
  font: '[inherit]',
  fontSize: '[13px]',
  fontWeight: 600,
  paddingBlock: '1',
  paddingInline: '3',
  borderRadius: 'pill',
  borderWidth: '[0]',
  background: '[transparent]',
  color: 'ink.muted',
  cursor: 'pointer'
});
const toggleBtnActiveClass = css({
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  boxShadow: 'card'
});

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '3'
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
export function HistoryStatsGrid({ stats, attemptCount, scope, onScopeChange }: Props) {
  const t = useTranslations('history.stats');
  // `panel(...)` is a slot recipe: it returns an object with one class
  // per slot (root / body / title / …). We only need the outer surface
  // here, so pluck `.root` for each variant up front.
  const paperPanel = panel({ surface: 'paper' }).root;
  const continuePanel = panel({ surface: 'continue' }).root;
  const unknown = t('bestUnknown');

  return (
    <div className={sectionWrapClass}>
      <div className={headRowClass}>
        <p className={progressLabelClass}>{t('yourProgress')}</p>
        <div className={toggleClass} role="group" aria-label={t('ariaLabel')}>
          <button
            type="button"
            className={cx(toggleBtnClass, scope === 'week' && toggleBtnActiveClass)}
            aria-pressed={scope === 'week'}
            onClick={() => onScopeChange('week')}
          >
            {t('scopeWeek')}
          </button>
          <button
            type="button"
            className={cx(toggleBtnClass, scope === 'lifetime' && toggleBtnActiveClass)}
            aria-pressed={scope === 'lifetime'}
            onClick={() => onScopeChange('lifetime')}
          >
            {t('scopeLifetime')}
          </button>
        </div>
      </div>
      <section className={gridClass} aria-label={t('ariaLabel')}>
        <Tile
          eyebrow={t('attempts')}
          big={String(attemptCount)}
          small={scope === 'week' ? t('attemptsUnitWeek') : t('attemptsUnitLifetime')}
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
          small={
            stats.bestSurah
              ? t('bestSubtitle', { surah: stats.bestSurah, ayah: stats.bestAyah ?? 0 })
              : unknown
          }
          panelClass={paperPanel}
          eyebrowClassName={eyebrowOnPaperClass}
          bigClassName={bigOnPaperClass}
          smallClassName={smallOnPaperClass}
        />
        <Tile
          eyebrow={t('streak')}
          big={String(stats.streakDays)}
          small={t('streakSubtitle', { best: stats.longestStreak })}
          panelClass={paperPanel}
          eyebrowClassName={eyebrowOnPaperClass}
          bigClassName={bigOnPaperClass}
          smallClassName={smallOnPaperClass}
        />
      </section>
    </div>
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
