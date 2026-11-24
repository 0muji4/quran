'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchScoringJob } from '../../../actions';
import { useStoredValue } from '../../../hooks/useLocalStorageState';
import { getRecentAttempts, type Attempt } from '../../../lib/storage';
import { HistoryFilterChips } from './HistoryFilterChips';
import { HistoryStatsGrid } from './HistoryStatsGrid';
import {
  ALL_FILTER,
  filterAttempts,
  historyFilterOptions,
  type HistoryFilter
} from './historyFilters';
import { computeHistoryStats, scoreTrendForAyah, type HistoryScope } from './historyStats';
import { HistoryMessage } from './HistoryMessage';
import { HistoryRow, type Playback } from './HistoryRow';
import { css } from '../../../../styled-system/css';
import { appSelect } from '../../../../styled-system/recipes';

type HistorySort = 'recent' | 'score';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// The totals above the attempts, and beside them in expanded windows.
const layoutClass = css({
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  gap: '6',
  expanded: { gridTemplateColumns: '[336px minmax(0, 1fr)]', columnGap: '8' }
});

const attemptsClass = css({ display: 'flex', flexDirection: 'column', gap: '2', minWidth: '[0]' });

const toolbarClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  columnGap: '4',
  rowGap: '3'
});

const sortClass = css({
  marginInlineStart: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  textStyle: 'labelLarge',
  color: 'onSurfaceVariant'
});

const selectWrapClass = css({ position: 'relative', display: 'inline-flex', alignItems: 'center' });

const selectArrowClass = css({
  position: 'absolute',
  insetInlineEnd: '[6px]',
  pointerEvents: 'none',
  color: 'onSurfaceVariant'
});

// The rows' padding reaches into the page's gutter, so their content lines up
// with the toolbar above.
const listClass = css({ listStyle: 'none', margin: '0', marginInline: '[-16px]', padding: '0' });

const filteredEmptyClass = css({
  margin: '0',
  paddingBlock: '8',
  textAlign: 'center',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant'
});

const startOfDay = (d: Date): number => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
};

// "Today · 14:02" / "Yesterday · 21:14" / "May 5 · 09:22", optionally
// with a "· m:ss" duration — the row's meta line.
const formatRowMeta = (iso: string, durationMs?: number | null): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const dayLabel =
    day === today
      ? 'Today'
      : day === today - 86_400_000
        ? 'Yesterday'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  let meta = `${dayLabel} · ${time}`;
  if (durationMs && durationMs > 0) {
    const total = Math.round(durationMs / 1000);
    meta += ` · ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  return meta;
};

interface Props {
  signedIn: boolean;
}

interface AttemptsSnapshot {
  attempts: Attempt[];
  readAt: number;
}

const readAttempts = (): AttemptsSnapshot => ({
  attempts: getRecentAttempts(),
  readAt: Date.now()
});

export function HistoryList({ signedIn }: Props) {
  const [snapshot, refreshAttempts] = useStoredValue<AttemptsSnapshot | null>(
    readAttempts,
    null,
    signedIn
  );
  const attempts = snapshot?.attempts ?? null;
  const [filter, setFilter] = useState<HistoryFilter>(ALL_FILTER);
  const [scope, setScope] = useState<HistoryScope>('week');
  const [scopeChangedAt, setScopeChangedAt] = useState(0);
  const [sort, setSort] = useState<HistorySort>('recent');
  // Inline playback state. `playingId` is the attempt currently sounding;
  // `loadingId` covers the fetch of its (lazily presigned) recording URL;
  // `errorId` flags a row whose recording could not be played.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // jobId → presigned recording URL (or null when none exists), so a
  // second play of the same row skips the round-trip.
  const urlCacheRef = useRef<Map<string, string | null>>(new Map());
  const t = useTranslations('history');

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAttempts();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refreshAttempts]);

  const handleScopeChange = (next: HistoryScope) => {
    setScope(next);
    setScopeChangedAt(Date.now());
  };

  // Attempts within the active range — drives the Attempts / Average /
  // Best tiles. Streak ignores the toggle (a streak is inherently
  // all-time), so it is read from a separate lifetime computation below.
  // The week ends at the latest read or scope change, which keeps the render
  // pure and still moves the window forward on either action.
  const scopeNow = Math.max(snapshot?.readAt ?? 0, scopeChangedAt);
  const scopedAttempts = useMemo(() => {
    const all = attempts ?? [];
    if (scope === 'lifetime') return all;
    const weekStart = scopeNow - MS_PER_WEEK;
    return all.filter((a) => {
      const at = new Date(a.createdAt).getTime();
      return Number.isFinite(at) && at >= weekStart;
    });
  }, [attempts, scope, scopeNow]);

  const stats = useMemo(() => {
    if (!attempts) return null;
    const scoped = computeHistoryStats(scopedAttempts);
    const lifetime = computeHistoryStats(attempts);
    return { ...scoped, streakDays: lifetime.streakDays, longestStreak: lifetime.longestStreak };
  }, [attempts, scopedAttempts]);

  const filterOptions = useMemo(() => historyFilterOptions(attempts ?? []), [attempts]);
  const visibleAttempts = useMemo(() => {
    const filtered = filterAttempts(attempts ?? [], filter);
    // `recent` keeps storage order (newest first). `score` sorts highest
    // first with unscored/failed attempts last; the spread keeps the
    // sort off the memoised source array.
    return sort === 'score'
      ? [...filtered].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      : filtered;
  }, [attempts, filter, sort]);

  const handlePlay = useCallback(
    async (attempt: Attempt) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playingId === attempt.id) {
        audio.pause();
        setPlayingId(null);
        return;
      }

      setErrorId(null);
      const start = (url: string) => {
        audio.src = url;
        setPlayingId(attempt.id);
        void audio.play().catch(() => {
          setPlayingId(null);
          setErrorId(attempt.id);
        });
      };

      const cached = urlCacheRef.current.get(attempt.jobId);
      if (cached !== undefined) {
        if (cached) start(cached);
        else setErrorId(attempt.id);
        return;
      }

      setLoadingId(attempt.id);
      try {
        const job = await fetchScoringJob(attempt.jobId);
        const url = job.recordingUrl ?? null;
        urlCacheRef.current.set(attempt.jobId, url);
        if (url) start(url);
        else setErrorId(attempt.id);
      } catch {
        setErrorId(attempt.id);
      } finally {
        setLoadingId(null);
      }
    },
    [playingId]
  );

  if (!signedIn) {
    return (
      <HistoryMessage
        icon={
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </>
        }
        title={t('signedOut.title')}
        body={t('signedOut.body')}
        href="/sign-in"
        cta={t('signedOut.cta')}
      />
    );
  }

  if (attempts === null) {
    return null; // first paint, before localStorage hydrate
  }

  if (attempts.length === 0) {
    return (
      <HistoryMessage
        icon={
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        }
        title={t('empty.title')}
        body={t('empty.body')}
        href="/"
        cta={t('empty.cta')}
      />
    );
  }

  const playbackOf = (id: string): Playback => {
    if (errorId === id) return 'error';
    if (loadingId === id) return 'loading';
    return playingId === id ? 'playing' : 'idle';
  };

  return (
    <div className={layoutClass}>
      {stats && (
        <HistoryStatsGrid
          stats={stats}
          attemptCount={scopedAttempts.length}
          scope={scope}
          onScopeChange={handleScopeChange}
        />
      )}
      <section className={attemptsClass} aria-label={t('listAriaLabel')}>
        <div className={toolbarClass}>
          <HistoryFilterChips options={filterOptions} selected={filter} onSelect={setFilter} />
          <div className={sortClass}>
            <label htmlFor="history-sort">{t('sort.label')}</label>
            <span className={selectWrapClass}>
              <select
                id="history-sort"
                className={appSelect()}
                value={sort}
                onChange={(e) => setSort(e.target.value as HistorySort)}
                aria-label={t('sort.ariaLabel')}
              >
                <option value="recent">{t('sort.recent')}</option>
                <option value="score">{t('sort.score')}</option>
              </select>
              <svg
                className={selectArrowClass}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </span>
          </div>
        </div>
        {/* Single shared element so only one recording sounds at a time. */}
        <audio ref={audioRef} preload="none" onEnded={() => setPlayingId(null)} hidden />
        {visibleAttempts.length === 0 ? (
          <p className={filteredEmptyClass}>{t('filteredEmpty')}</p>
        ) : (
          <ul className={listClass}>
            {visibleAttempts.map((a) => (
              <li key={a.id}>
                <HistoryRow
                  attempt={a}
                  meta={formatRowMeta(a.createdAt, a.durationMs)}
                  trend={scoreTrendForAyah(attempts, a.surahId, a.ayahNumber)}
                  playback={playbackOf(a.id)}
                  onPlay={() => void handlePlay(a)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
