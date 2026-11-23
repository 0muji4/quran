'use client';

import { useTranslations } from 'next-intl';
import { useStoredValue } from '../../../../hooks/useLocalStorageState';
import { getAttemptsForToday, getBestScore } from '../../../../lib/storage';
import { css } from '../../../../../styled-system/css';

interface Props {
  surahId: string;
  ayahNumber: number;
  durationMs?: number | null;
}

const formatDuration = (ms: number | null | undefined): string => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const EMPTY_STATS: { personalBest: number | null; attemptsToday: number } = {
  personalBest: null,
  attemptsToday: 0
};

const listClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  rowGap: '2',
  columnGap: '8',
  margin: '0',
  marginTop: '2',
  paddingTop: '3',
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: 'outlineVariant'
});

const statClass = css({ display: 'flex', flexDirection: 'column', gap: '[2px]' });

const labelClass = css({ textStyle: 'bodySmall', color: 'onSurfaceVariant' });

const valueClass = css({ margin: '0', textStyle: 'titleLarge' });

export function SideStats({ surahId, ayahNumber, durationMs }: Props) {
  const [{ personalBest, attemptsToday }] = useStoredValue(
    () => ({
      personalBest: getBestScore(surahId, ayahNumber)?.score ?? null,
      attemptsToday: getAttemptsForToday(surahId, ayahNumber).length
    }),
    EMPTY_STATS,
    `${surahId}:${ayahNumber}`
  );
  const t = useTranslations('result.sideStats');

  return (
    <dl className={listClass}>
      <div className={statClass}>
        <dt className={labelClass}>{t('personalBest')}</dt>
        <dd className={valueClass}>{personalBest ?? '—'}</dd>
      </div>
      <div className={statClass}>
        <dt className={labelClass}>{t('attemptsToday')}</dt>
        <dd className={valueClass}>{attemptsToday}</dd>
      </div>
      <div className={statClass}>
        <dt className={labelClass}>{t('duration')}</dt>
        <dd className={valueClass}>{formatDuration(durationMs)}</dd>
      </div>
    </dl>
  );
}
