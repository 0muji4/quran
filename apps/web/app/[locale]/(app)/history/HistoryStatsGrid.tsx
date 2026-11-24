'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '../../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../../styled-system/css';
import { appCard } from '../../../../styled-system/recipes';
import type { HistoryStats, HistoryScope } from './historyStats';

interface Props {
  stats: HistoryStats;
  /** Count for the Attempts tile — scoped (this week) or total (lifetime). */
  attemptCount: number;
  scope: HistoryScope;
  onScopeChange: (scope: HistoryScope) => void;
}

const sectionClass = css({
  alignSelf: 'start',
  display: 'flex',
  flexDirection: 'column',
  gap: '3'
});

const headClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '2'
});

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

// A Material 3 segmented button: one outline around both segments, and the
// selected one filled with a check.
const segmentsClass = css({ display: 'flex' });

const segmentClass = css({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2',
  minHeight: '[40px]',
  paddingInline: '3',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outline',
  color: 'onSurface',
  cursor: 'pointer',
  textStyle: 'labelLarge',
  whiteSpace: 'nowrap',
  _first: { borderStartStartRadius: 'full', borderEndStartRadius: 'full' },
  _last: {
    marginInlineStart: '[-1px]',
    borderStartEndRadius: 'full',
    borderEndEndRadius: 'full'
  },
  _hover: { background: 'surfaceContainerHigh' },
  _pressed: { background: 'secondaryContainer', color: 'onSecondaryContainer' },
  _focusVisible: {
    outlineWidth: '[3px]',
    outlineStyle: 'solid',
    outlineColor: 'secondary',
    outlineOffset: '[2px]',
    zIndex: 1
  }
});

// Beside the list in expanded windows the tiles are two by two again.
const tilesClass = css({
  margin: '0',
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '3',
  medium: { gridTemplateColumns: '[repeat(4, minmax(0, 1fr))]' },
  expanded: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' }
});

const tileClass = cx(
  appCard({ variant: 'filled' }),
  css({
    display: 'flex',
    flexDirection: 'column',
    gap: '[2px]',
    padding: '4',
    '&[data-emphasis]': { background: 'secondaryContainer', color: 'onSecondaryContainer' }
  })
);

const mutedClass = css({
  color: 'onSurfaceVariant',
  '[data-emphasis] &': { color: '[inherit]' }
});

const labelClass = cx(mutedClass, css({ textStyle: 'labelMedium' }));

const valueClass = css({
  display: 'block',
  textStyle: 'headlineLarge',
  fontVariantNumeric: 'tabular-nums'
});

const unitClass = cx(mutedClass, css({ display: 'block', textStyle: 'bodySmall' }));

const SCOPES: HistoryScope[] = ['week', 'lifetime'];

/** The range control and the four totals: attempts, average, best and streak. */
export function HistoryStatsGrid({ stats, attemptCount, scope, onScopeChange }: Props) {
  const t = useTranslations('history.stats');
  const unknown = t('bestUnknown');
  const scopeLabels = { week: t('scopeWeek'), lifetime: t('scopeLifetime') };

  return (
    <section className={sectionClass} aria-label={t('ariaLabel')}>
      <div className={headClass}>
        <h2 className={titleClass}>{t('yourProgress')}</h2>
        <div className={segmentsClass} role="group" aria-label={t('scopeAriaLabel')}>
          {SCOPES.map((value) => (
            <button
              key={value}
              type="button"
              className={segmentClass}
              aria-pressed={scope === value}
              onClick={() => onScopeChange(value)}
            >
              {scope === value && <CheckIcon />}
              {scopeLabels[value]}
            </button>
          ))}
        </div>
      </div>
      <dl className={tilesClass}>
        <Tile
          label={t('attempts')}
          value={String(attemptCount)}
          unit={scope === 'week' ? t('attemptsUnitWeek') : t('attemptsUnitLifetime')}
        />
        <Tile
          label={t('average')}
          value={stats.averageScore === null ? unknown : String(Math.round(stats.averageScore))}
          unit={t('averageUnit')}
          emphasis
        />
        <Tile
          label={t('best')}
          value={stats.bestScore === null ? unknown : String(Math.round(stats.bestScore))}
          unit={
            stats.bestSurah
              ? t('bestSubtitle', { surah: stats.bestSurah, ayah: stats.bestAyah ?? 0 })
              : unknown
          }
        />
        <Tile
          label={t('streak')}
          value={String(stats.streakDays)}
          unit={t('streakSubtitle', { best: stats.longestStreak })}
        />
      </dl>
    </section>
  );
}

interface TileProps {
  label: string;
  value: string;
  unit: string;
  emphasis?: boolean;
}

function Tile({ label, value, unit, emphasis = false }: TileProps) {
  return (
    <div className={tileClass} data-emphasis={emphasis ? '' : undefined}>
      <dt className={labelClass}>{label}</dt>
      <dd className={css({ margin: '0' })}>
        <span className={valueClass}>{value}</span>
        <span className={unitClass}>{unit}</span>
      </dd>
    </div>
  );
}
