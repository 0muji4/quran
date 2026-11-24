'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import { PauseIcon, PlayIcon } from '../../../components/icons/MediaIcons';
import type { Attempt } from '../../../lib/storage';
import { css, cx } from '../../../../styled-system/css';
import { appIconButton, appListItem } from '../../../../styled-system/recipes';
import { toneForVerdict, verdictForScore } from '../practice/result/verdict';
import { VerdictChip } from '../practice/result/VerdictChip';
import { Sparkline } from './Sparkline';

/** Where the row's recording is: at rest, being fetched, sounding, or not playable. */
export type Playback = 'idle' | 'loading' | 'playing' | 'error';

interface Props {
  attempt: Attempt;
  /** The date, time and length of the attempt. */
  meta: string;
  /** Recent scores for the same ayah, oldest first. */
  trend: number[];
  playback: Playback;
  onPlay: () => void;
}

// The play button is a sibling of the link: a button must not nest inside an
// anchor.
const rowClass = css({ display: 'flex', alignItems: 'center', paddingInlineEnd: '3' });

const linkClass = cx(
  appListItem(),
  css({ flex: '1', minWidth: '[0]', gap: '3', paddingInlineEnd: '2', medium: { gap: '4' } })
);

const numberClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '[40px]',
  height: '[40px]',
  borderRadius: 'full',
  background: 'secondaryContainer',
  color: 'onSecondaryContainer',
  textStyle: 'labelLarge'
});

const textClass = css({ flex: '1', minWidth: '[0]', display: 'flex', flexDirection: 'column' });

const titleClass = css({ textStyle: 'bodyLarge' });

const metaClass = css({
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant',
  '&[data-error]': { color: 'error' }
});

// The trend needs more room than a compact row has.
const trendClass = css({
  display: 'none',
  flexShrink: 0,
  color: 'onSurfaceVariant',
  medium: { display: 'flex' }
});

// Wide enough for every score, so the trends and scores line up.
const scoreClass = css({
  flexShrink: 0,
  minWidth: '[72px]',
  display: 'flex',
  justifyContent: 'center',
  color: 'onSurfaceVariant',
  fontVariantNumeric: 'tabular-nums'
});

const playClass = css({ '&[data-error]': { color: 'error' } });

// A Material 3 circular progress indicator.
const spinnerClass = css({
  animation: '[appSpin 1s linear infinite]',
  _motionReduce: { animation: 'none' }
});

function PlaybackIcon({ playback }: { playback: Playback }) {
  switch (playback) {
    case 'idle':
      return <PlayIcon size={22} />;
    case 'playing':
      return <PauseIcon size={22} />;
    case 'loading':
      return (
        <svg
          className={spinnerClass}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" strokeDasharray="18 60" />
        </svg>
      );
    case 'error':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
}

/**
 * One attempt as a Material 3 list item: the surah's number, the ayah, when
 * it was recited, the score's trend and verdict, and playback.
 */
export function HistoryRow({ attempt, meta, trend, playback, onPlay }: Props) {
  const t = useTranslations('history.row');
  // An attempt that failed to score has no score to show.
  const score = attempt.status === 'COMPLETED' ? attempt.score : null;
  const isError = playback === 'error';
  const playLabels: Record<Playback, string> = {
    idle: t('play'),
    loading: t('loadingRecording'),
    playing: t('pause'),
    error: t('recordingUnavailable')
  };

  return (
    <div className={rowClass}>
      <Link href={`/practice/${attempt.surahId}/${attempt.ayahNumber}`} className={linkClass}>
        <span className={numberClass} aria-hidden="true">
          {attempt.surahId}
        </span>
        <span className={textClass}>
          <span className={titleClass}>
            {t('title', { name: attempt.surahNameEn, ayah: attempt.ayahNumber })}
          </span>
          <span className="sr-only">, </span>
          <span className={metaClass} data-error={isError ? '' : undefined}>
            {/* Isolated, so a date keeps its order in right-to-left text. */}
            <bdi>{isError ? t('recordingUnavailable') : meta}</bdi>
          </span>
        </span>
        <span className={trendClass}>
          <Sparkline values={trend} />
        </span>
        <span className={scoreClass}>
          <span className="sr-only">
            , {score !== null ? t('scoreAriaLabel', { score }) : t('failedAriaLabel')}
          </span>
          {score !== null ? (
            <VerdictChip tone={toneForVerdict(verdictForScore(score))}>
              <span aria-hidden="true">{score}</span>
            </VerdictChip>
          ) : (
            <span aria-hidden="true">—</span>
          )}
        </span>
      </Link>
      <button
        type="button"
        className={cx(
          appIconButton({ variant: playback === 'playing' ? 'tonal' : 'standard' }),
          playClass
        )}
        data-error={isError ? '' : undefined}
        onClick={onPlay}
        disabled={playback === 'loading'}
        aria-label={playLabels[playback]}
      >
        <PlaybackIcon playback={playback} />
      </button>
    </div>
  );
}
