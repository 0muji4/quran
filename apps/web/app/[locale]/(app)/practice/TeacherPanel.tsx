'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTeacherAudio, type PlaybackRate } from '../../../hooks/useTeacherAudio';
import { LoopIcon, PauseIcon, PlayIcon, SpeakerIcon } from '../../../components/icons/MediaIcons';
import { Waveform } from './Waveform';
import { onRecordingStarted } from './recordingEvents';
import { trackUiEvent } from '../../../telemetry/use-ui-event';
import styles from '../../../styles/practice.module.css';

const RATES: PlaybackRate[] = [0.75, 1, 1.25];

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface Props {
  surahId: number;
  ayahNumber: number;
}

export function TeacherPanel({ surahId, ayahNumber }: Props) {
  const audio = useTeacherAudio(surahId, ayahNumber);
  const t = useTranslations('practice.teacher');

  useEffect(() => onRecordingStarted(() => audio.pause()), [audio]);

  const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
  const seed = surahId * 1000 + ayahNumber;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitleRow}>
          <span className={`${styles.panelIcon} ${styles.panelIconMint}`}>
            <SpeakerIcon size={18} />
          </span>
          <div>
            <h2 className={styles.panelTitle}>{t('title')}</h2>
            <p className={styles.panelSubtitle}>{t('subtitle')}</p>
          </div>
        </div>
        <span className={styles.panelDuration}>{formatTime(audio.duration)}</span>
      </div>

      <audio
        ref={audio.audioRef}
        src={audio.url ?? undefined}
        preload="metadata"
        className="sr-only"
      />

      <div className={styles.teacherPlayer}>
        <button
          type="button"
          className={styles.playButton}
          onClick={audio.togglePlay}
          disabled={!audio.url}
          aria-label={audio.isPlaying ? t('pause') : t('play')}
        >
          {audio.isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
        <Waveform seed={seed} progress={progress} />
        <span className={styles.waveTime}>
          {formatTime(audio.currentTime)} / {formatTime(audio.duration)}
        </span>
      </div>

      <div className={styles.teacherControls}>
        <div className={styles.speedPills} role="group" aria-label={t('speedAriaLabel')}>
          {RATES.map((r) => {
            const active = audio.rate === r;
            return (
              <button
                key={r}
                type="button"
                className={
                  active ? `${styles.speedPill} ${styles.speedPillActive}` : styles.speedPill
                }
                onClick={() => {
                  audio.setRate(r);
                  trackUiEvent('web.ui.speed_changed', {
                    surahId,
                    ayahNumber,
                    rate: r
                  });
                }}
                aria-pressed={active}
              >
                {r.toFixed(2)}×
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={audio.loop ? `${styles.loopBtn} ${styles.loopBtnActive}` : styles.loopBtn}
          onClick={() => {
            audio.toggleLoop();
            trackUiEvent('web.ui.loop_toggled', {
              surahId,
              ayahNumber,
              loop: !audio.loop
            });
          }}
          aria-pressed={audio.loop}
        >
          {t('loop')} <LoopIcon />
        </button>
      </div>

      {audio.error && <p className="status error">{t('unavailable', { message: audio.error })}</p>}
    </div>
  );
}
