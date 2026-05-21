'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import { getRecentAttempts, type Attempt } from '../../../lib/storage';
import { formatPracticedAt } from '../../../lib/classify';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';
import { HistoryFilterChips } from './HistoryFilterChips';
import { HistoryStatsGrid } from './HistoryStatsGrid';
import {
  ALL_FILTER,
  filterAttempts,
  historyFilterOptions,
  type HistoryFilter
} from './historyFilters';
import { computeHistoryStats } from './historyStats';
import { css, cx } from '../../../../styled-system/css';
import { statusPill } from '../../../../styled-system/recipes';

const HISTORY_MOBILE_MQ = '@media (max-width: 640px)';

const listClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  listStyle: 'none',
  padding: '[0]',
  margin: '[0]'
});

const listItemClass = css({ listStyle: 'none' });

const rowClass = css({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto auto',
  alignItems: 'center',
  gap: '4',
  paddingBlock: '4',
  paddingInline: '5',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  textDecoration: 'none',
  color: '[inherit]',
  [HISTORY_MOBILE_MQ]: {
    gridTemplateColumns: '1fr auto',
    gridTemplateAreas: '"score status" "info  info"'
  }
});

const scoreBaseClass = css({
  fontFamily: 'serif',
  fontSize: '[28px]',
  color: 'teal',
  minWidth: '[64px]',
  fontVariantNumeric: 'tabular-nums',
  [HISTORY_MOBILE_MQ]: { gridArea: 'score' }
});

const scoreFailedClass = css({
  color: 'red',
  fontSize: '[16px]'
});

const infoClass = css({
  [HISTORY_MOBILE_MQ]: { gridArea: 'info' }
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[18px]',
  color: 'ink.strong'
});

const metaClass = css({
  fontSize: '[13px]',
  color: 'ink.muted',
  marginTop: '[2px]'
});

const statusPillMobileClass = css({
  [HISTORY_MOBILE_MQ]: { gridArea: 'status' }
});

const emptyClass = css({
  textAlign: 'center',
  paddingBlock: '12',
  paddingInline: '6',
  backgroundColor: 'bg.paper',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  color: 'ink.muted'
});

const emptyTitleClass = css({
  fontFamily: 'serif',
  fontSize: '[24px]',
  color: 'ink.strong',
  marginBottom: '3'
});

const emptyCtaClass = css({ marginTop: '4', textDecoration: 'none' });

// Inline empty state for the "filter matched nothing" case — distinct
// from the full-page empty state because the chips above are still
// available to reset the filter back to All.
const filteredEmptyClass = css({
  textAlign: 'center',
  paddingBlock: '8',
  paddingInline: '4',
  color: 'ink.muted',
  fontSize: '[14px]'
});

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

interface Props {
  signedIn: boolean;
}

export function HistoryList({ signedIn }: Props) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>(ALL_FILTER);
  const t = useTranslations('history');

  // Re-read on mount and whenever the sign-in state flips. iOS does the
  // same via `task(id: session.currentUser?.id)` so the gated history
  // store reflects the new identity without waiting for the next page
  // navigation.
  useEffect(() => {
    setAttempts(getRecentAttempts());
  }, [signedIn]);

  // Re-read when the page becomes visible again (tab switch, app focus).
  // iOS's `HistoryView.onAppear` covers the same case; on the web,
  // staying on `/history` while another device records an attempt would
  // otherwise leave the list stale until a manual reload.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setAttempts(getRecentAttempts());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const stats = useMemo(() => (attempts ? computeHistoryStats(attempts) : null), [attempts]);
  const filterOptions = useMemo(() => historyFilterOptions(attempts ?? []), [attempts]);
  const visibleAttempts = useMemo(() => filterAttempts(attempts ?? [], filter), [attempts, filter]);

  if (!signedIn) {
    return (
      <div className={emptyClass}>
        <p className={emptyTitleClass}>{t('signedOut.title')}</p>
        <p>{t('signedOut.body')}</p>
        <Link href="/sign-in" className={cx(statusPill({ tone: 'completed' }), emptyCtaClass)}>
          {t('signedOut.cta')} <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  if (attempts === null) {
    return null; // first paint, before localStorage hydrate
  }

  if (attempts.length === 0) {
    return (
      <div className={emptyClass}>
        <p className={emptyTitleClass}>{t('empty.title')}</p>
        <p>{t('empty.body')}</p>
        <Link href="/" className={cx(statusPill({ tone: 'completed' }), emptyCtaClass)}>
          {t('empty.cta')} <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  return (
    <>
      {stats && <HistoryStatsGrid stats={stats} />}
      <HistoryFilterChips options={filterOptions} selected={filter} onSelect={setFilter} />
      {visibleAttempts.length === 0 ? (
        <p className={filteredEmptyClass}>{t('filteredEmpty')}</p>
      ) : (
        <ul className={listClass}>
          {visibleAttempts.map((a) => {
            const completed = a.status === 'COMPLETED';
            return (
              <li key={a.id} className={listItemClass}>
                <Link href={`/practice/${a.surahId}/${a.ayahNumber}`} className={rowClass}>
                  <span
                    className={completed ? scoreBaseClass : cx(scoreBaseClass, scoreFailedClass)}
                    aria-label={
                      completed
                        ? t('row.scoreAriaLabel', { score: a.score ?? 0 })
                        : t('row.failedAriaLabel')
                    }
                  >
                    {completed && a.score !== null ? a.score : '—'}
                  </span>
                  <div className={infoClass}>
                    <p className={titleClass}>
                      {t('row.title', { name: a.surahNameEn, ayah: a.ayahNumber })}
                    </p>
                    <p className={metaClass}>
                      {formatDate(a.createdAt)} · {formatPracticedAt(a.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cx(
                      statusPill({ tone: completed ? 'completed' : 'failed' }),
                      statusPillMobileClass
                    )}
                  >
                    {completed ? t('row.statusCompleted') : t('row.statusFailed')}
                  </span>
                  <ArrowRightIcon size={14} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
