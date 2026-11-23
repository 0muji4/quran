'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTeacherAudio, type PlaybackRate } from '../../../hooks/useTeacherAudio';
import { LoopIcon, PauseIcon, PlayIcon } from '../../../components/icons/MediaIcons';
import { onRecordingStarted } from './recordingEvents';
import { trackUiEvent } from '../../../telemetry/use-ui-event';
import { css, cx } from '../../../../styled-system/css';
import { appCard, appChip, appIconButton, appSelect } from '../../../../styled-system/recipes';

const RATES: PlaybackRate[] = [0.75, 1, 1.25];

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const panelClass = cx(
  appCard({ variant: 'filled' }),
  css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '3',
    paddingInline: '4',
    paddingBlock: '3'
  })
);

const textClass = css({
  flex: '[1 1 140px]',
  minWidth: '[0]',
  display: 'flex',
  flexDirection: 'column'
});

const titleClass = css({ margin: '0', textStyle: 'bodyLarge', color: '[inherit]' });

const subtitleClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const controlsClass = css({ display: 'flex', alignItems: 'center', gap: '2' });

const selectWrapClass = css({ position: 'relative', display: 'inline-flex', alignItems: 'center' });

const selectArrowClass = css({
  position: 'absolute',
  insetInlineEnd: '[6px]',
  pointerEvents: 'none',
  color: 'onSurfaceVariant'
});

const errorClass = css({
  flexBasis: '[100%]',
  margin: '0',
  textStyle: 'bodyMedium',
  color: 'error'
});

const srOnly = css({ srOnly: true });

interface Props {
  surahId: number;
  ayahNumber: number;
}

export function TeacherPanel({ surahId, ayahNumber }: Props) {
  const { audioRef, ...audio } = useTeacherAudio(surahId, ayahNumber);
  const t = useTranslations('practice.teacher');

  useEffect(() => onRecordingStarted(() => audio.pause()), [audio]);

  return (
    <section className={panelClass} aria-labelledby="teacher-title">
      <audio ref={audioRef} src={audio.url ?? undefined} preload="metadata" className={srOnly} />

      <button
        type="button"
        className={appIconButton({ variant: 'tonal' })}
        onClick={audio.togglePlay}
        disabled={!audio.url}
        aria-label={audio.isPlaying ? t('pause') : t('play')}
      >
        {audio.isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
      </button>

      <div className={textClass}>
        <h2 id="teacher-title" className={titleClass}>
          {t('title')}
        </h2>
        <p className={subtitleClass}>
          {t('subtitle')} · {formatTime(audio.currentTime)} / {formatTime(audio.duration)}
        </p>
      </div>

      <div className={controlsClass}>
        <button
          type="button"
          className={appChip()}
          onClick={() => {
            audio.toggleLoop();
            trackUiEvent('web.ui.loop_toggled', { surahId, ayahNumber, loop: !audio.loop });
          }}
          aria-pressed={audio.loop}
        >
          <LoopIcon />
          {t('loop')}
        </button>
        <label className={selectWrapClass}>
          <span className={srOnly}>{t('speedAriaLabel')}</span>
          <select
            className={appSelect()}
            value={String(audio.rate)}
            onChange={(event) => {
              const rate = Number(event.target.value) as PlaybackRate;
              audio.setRate(rate);
              trackUiEvent('web.ui.speed_changed', { surahId, ayahNumber, rate });
            }}
          >
            {RATES.map((r) => (
              <option key={r} value={String(r)}>
                {r}×
              </option>
            ))}
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
        </label>
      </div>

      {audio.error && (
        <p className={errorClass} role="alert">
          {t('unavailable', { message: audio.error })}
        </p>
      )}
    </section>
  );
}
