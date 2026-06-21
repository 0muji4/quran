'use client';

import { useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../../../styles/practice.module.css';

interface Props {
  teacherUrl: string | null;
  userRecordingUrl: string | null;
  teacherLabel?: string;
}

// Static, decorative waveform silhouette (the players are not scrubbable;
// the bars stand in for the recording's shape, matching the mockup).
const WAVE = [
  34, 58, 30, 76, 46, 64, 38, 88, 52, 70, 40, 82, 36, 60, 44, 90, 50, 66, 32, 78, 48, 62, 42, 72
];

// Side-by-side playback so the user can compare their recitation against the
// teacher's reference. Both URLs are presigned and short-lived (~1h); if one
// is missing we hide that side rather than rendering a broken control.
export function ListenBack({ teacherUrl, userRecordingUrl, teacherLabel }: Props) {
  const t = useTranslations('result.listenBack');
  const teacherRef = useRef<HTMLAudioElement>(null);
  const userRef = useRef<HTMLAudioElement>(null);
  const canPlayBoth = teacherUrl !== null && userRecordingUrl !== null;
  const resolvedTeacherLabel = teacherLabel ?? t('teacherDefault');

  const handlePlayBoth = () => {
    const teacher = teacherRef.current;
    const user = userRef.current;
    if (!teacher || !user) return;
    // Reset both players so a second click restarts cleanly.
    user.pause();
    user.currentTime = 0;
    teacher.pause();
    teacher.currentTime = 0;

    const startUser = () => {
      teacher.removeEventListener('ended', startUser);
      user.currentTime = 0;
      void user.play().catch(() => {});
    };
    teacher.addEventListener('ended', startUser);
    void teacher.play().catch(() => teacher.removeEventListener('ended', startUser));
  };

  if (!teacherUrl && !userRecordingUrl) return null;

  return (
    <section className={styles.listenBackSection} aria-labelledby="listen-back-heading">
      <header className={styles.listenBackHead}>
        <div>
          <h2 id="listen-back-heading" className={styles.listenBackTitle}>
            {t('title')}
          </h2>
          <p className={styles.listenBackSubtitle}>{t('subtitle')}</p>
        </div>
        {canPlayBoth && (
          <button type="button" className={styles.listenBackPlayBoth} onClick={handlePlayBoth}>
            {t('playBoth')}
            <span aria-hidden="true">▶▶</span>
          </button>
        )}
      </header>

      <div className={styles.listenBackGrid}>
        {teacherUrl ? (
          <ListenBackTile
            audioRef={teacherRef}
            kind="teacher"
            title={t('teacher')}
            subtitle={resolvedTeacherLabel}
            src={teacherUrl}
            fallback={t('audioFallback')}
          />
        ) : null}
        {userRecordingUrl ? (
          <ListenBackTile
            audioRef={userRef}
            kind="user"
            title={t('you')}
            subtitle={t('youJustNow')}
            src={userRecordingUrl}
            fallback={t('audioFallback')}
          />
        ) : (
          <div className={`${styles.listenBackTile} ${styles.listenBackTileMuted}`}>
            <div className={styles.listenBackTileHead}>
              <span className={styles.listenBackTileTitle}>{t('you')}</span>
              <span className={styles.listenBackTileSubtitle}>{t('youNotAvailable')}</span>
            </div>
            <p className={styles.listenBackEmpty}>{t('youEmpty')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function ListenBackTile({
  audioRef,
  kind,
  title,
  subtitle,
  src,
  fallback
}: {
  audioRef: RefObject<HTMLAudioElement>;
  kind: 'teacher' | 'user';
  title: string;
  subtitle: string;
  src: string;
  fallback: string;
}) {
  const t = useTranslations('result.listenBack');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  const tileClass =
    kind === 'teacher'
      ? `${styles.listenBackTile} ${styles.listenBackTileTeacher}`
      : `${styles.listenBackTile} ${styles.listenBackTileUser}`;
  const buttonClass =
    kind === 'teacher'
      ? `${styles.listenBackPlayBtn} ${styles.listenBackPlayBtnTeacher}`
      : `${styles.listenBackPlayBtn} ${styles.listenBackPlayBtnUser}`;
  const waveClass =
    kind === 'teacher'
      ? `${styles.listenBackWave} ${styles.listenBackWaveTeacher}`
      : `${styles.listenBackWave} ${styles.listenBackWaveUser}`;

  return (
    <div className={tileClass}>
      <div className={styles.listenBackTileHead}>
        <span className={styles.listenBackTileTitle}>{title}</span>
        <span className={styles.listenBackTileSubtitle}>{subtitle}</span>
      </div>
      <div className={styles.listenBackPlayer}>
        <button
          type="button"
          className={buttonClass}
          onClick={toggle}
          aria-label={`${playing ? t('pause') : t('play')} ${title}`}
        >
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        </button>
        <span className={waveClass} aria-hidden="true">
          {WAVE.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </span>
        <span className={styles.listenBackDuration}>
          {duration === null ? '–:--' : formatTime(duration)}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      >
        {fallback}
      </audio>
    </div>
  );
}
