'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import { fetchScoringJob } from '../../../actions';
import { getRecentAttempts, type Attempt } from '../../../lib/storage';
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
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';

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

// A row is a navigable Link (avatar + info + score) with the playback
// button as a *sibling* — a <button> must not nest inside an <a>.
const rowClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  paddingBlock: '4',
  paddingInline: '5',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md'
});

const rowLinkClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  flex: '1',
  minWidth: '[0]',
  textDecoration: 'none',
  color: '[inherit]'
});

// Cream disc carrying the ayah number, mirroring the design's leading
// avatar. Decorative — the row's accessible label lives on the title.
const avatarClass = css({
  flexShrink: '0',
  width: '[40px]',
  height: '[40px]',
  borderRadius: 'pill',
  backgroundColor: 'bg.page',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'serif',
  fontSize: '[15px]',
  color: 'ink.muted',
  fontVariantNumeric: 'tabular-nums'
});

const infoClass = css({ flex: '1', minWidth: '[0]' });

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

const scoreClass = css({
  fontFamily: 'serif',
  fontSize: '[28px]',
  fontVariantNumeric: 'tabular-nums',
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '[2px]',
  flexShrink: '0',
  [HISTORY_MOBILE_MQ]: { fontSize: '[24px]' }
});

// ≥80 reads as the brand green, below that as the AA-safe warm gold
// (ADR 0003 gold.onLight), and a failed attempt as red — so the colour
// alone conveys the tier without relying on the number.
const scorePassClass = css({ color: 'teal' });
const scoreMidClass = css({ color: 'gold.onLight' });
const scoreFailedClass = css({ color: 'red', fontSize: '[16px]' });

const scoreSuffixClass = css({ fontSize: '[13px]', color: 'ink.muted' });

const playButtonClass = css({
  flexShrink: '0',
  width: '[40px]',
  height: '[40px]',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'teal',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '[14px]',
  cursor: 'pointer',
  _hover: { backgroundColor: 'bg.page' },
  _disabled: { opacity: 0.5, cursor: 'progress' }
});

const playButtonErrorClass = css({ color: 'red', borderColor: 'red' });

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

const filteredEmptyClass = css({
  textAlign: 'center',
  paddingBlock: '8',
  paddingInline: '4',
  color: 'ink.muted',
  fontSize: '[14px]'
});

const startOfDay = (d: Date): number => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
};

// "Today · 14:02" / "Yesterday · 21:14" / "May 5 · 09:22", optionally
// with a "· m:ss" duration — matching the design's row meta line.
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

export function HistoryList({ signedIn }: Props) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>(ALL_FILTER);
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
    setAttempts(getRecentAttempts());
  }, [signedIn]);

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
      {/* Single shared element so only one recording sounds at a time. */}
      <audio ref={audioRef} preload="none" onEnded={() => setPlayingId(null)} hidden />
      {visibleAttempts.length === 0 ? (
        <p className={filteredEmptyClass}>{t('filteredEmpty')}</p>
      ) : (
        <ul className={listClass}>
          {visibleAttempts.map((a) => {
            // null score → failed/unscored row (renders "—"); a number
            // narrows the score branches below for TypeScript.
            const score = a.status === 'COMPLETED' ? a.score : null;
            const isPlaying = playingId === a.id;
            const isLoading = loadingId === a.id;
            const isError = errorId === a.id;
            return (
              <li key={a.id} className={listItemClass}>
                <div className={rowClass}>
                  <Link href={`/practice/${a.surahId}/${a.ayahNumber}`} className={rowLinkClass}>
                    <span className={avatarClass} aria-hidden="true">
                      {a.ayahNumber}
                    </span>
                    <span className={infoClass}>
                      <span className={titleClass}>
                        {t('row.title', { name: a.surahNameEn, ayah: a.ayahNumber })}
                      </span>
                      <span className={metaClass}>{formatRowMeta(a.createdAt, a.durationMs)}</span>
                    </span>
                    <span
                      className={cx(
                        scoreClass,
                        score !== null
                          ? score >= 80
                            ? scorePassClass
                            : scoreMidClass
                          : scoreFailedClass
                      )}
                      aria-label={
                        score !== null
                          ? t('row.scoreAriaLabel', { score })
                          : t('row.failedAriaLabel')
                      }
                    >
                      {score !== null ? (
                        <>
                          {score}
                          <span className={scoreSuffixClass} aria-hidden="true">
                            /100
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className={cx(playButtonClass, isError && playButtonErrorClass)}
                    onClick={() => void handlePlay(a)}
                    disabled={isLoading}
                    aria-label={
                      isError
                        ? t('row.recordingUnavailable')
                        : isLoading
                          ? t('row.loadingRecording')
                          : isPlaying
                            ? t('row.pause')
                            : t('row.play')
                    }
                  >
                    <span aria-hidden="true">
                      {isLoading ? '…' : isError ? '!' : isPlaying ? '❚❚' : '▶'}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
