'use client';

import { useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { PauseIcon, PlayIcon } from '../../../../components/icons/MediaIcons';
import { css, cx } from '../../../../../styled-system/css';
import { appButton, appCard, appIconButton } from '../../../../../styled-system/recipes';

interface Props {
  teacherUrl: string | null;
  userRecordingUrl: string | null;
  teacherLabel?: string;
}

const sectionClass = cx(
  appCard({ variant: 'filled' }),
  css({ alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '2', padding: '4' })
);

const headClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '2'
});

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

const subtleClass = css({ margin: '0', textStyle: 'bodySmall', color: 'onSurfaceVariant' });

const playBothClass = cx(appButton({ variant: 'text' }), css({ flexShrink: 0 }));

const rowClass = css({ display: 'flex', alignItems: 'center', gap: '3', minHeight: '[56px]' });

const rowTextClass = css({
  flexGrow: 1,
  minWidth: '[0]',
  display: 'flex',
  flexDirection: 'column'
});

const rowLabelClass = css({ textStyle: 'bodyLarge' });

const missingClass = css({ paddingBlock: '2' });

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
    <section className={sectionClass} aria-labelledby="listen-back-heading">
      <div className={headClass}>
        <div>
          <h2 id="listen-back-heading" className={titleClass}>
            {t('title')}
          </h2>
          <p className={subtleClass}>{t('subtitle')}</p>
        </div>
        {canPlayBoth && (
          <button type="button" className={playBothClass} onClick={handlePlayBoth}>
            {t('playBoth')}
          </button>
        )}
      </div>

      {teacherUrl ? (
        <ListenBackRow
          audioRef={teacherRef}
          title={t('teacher')}
          subtitle={resolvedTeacherLabel}
          src={teacherUrl}
          fallback={t('audioFallback')}
        />
      ) : null}
      {userRecordingUrl ? (
        <ListenBackRow
          audioRef={userRef}
          title={t('you')}
          subtitle={t('youJustNow')}
          src={userRecordingUrl}
          fallback={t('audioFallback')}
        />
      ) : (
        <div className={missingClass}>
          <span className={rowLabelClass}>{t('you')}</span>
          <p className={subtleClass}>{t('youNotAvailable')}</p>
          <p className={subtleClass}>{t('youEmpty')}</p>
        </div>
      )}
    </section>
  );
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function ListenBackRow({
  audioRef,
  title,
  subtitle,
  src,
  fallback
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
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

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={appIconButton({ variant: 'tonal' })}
        onClick={toggle}
        aria-label={`${playing ? t('pause') : t('play')} ${title}`}
      >
        {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
      </button>
      <div className={rowTextClass}>
        <span className={rowLabelClass}>{title}</span>
        <span className={subtleClass}>{subtitle}</span>
      </div>
      {/* The duration appears once the audio's metadata loads. */}
      <span className={subtleClass} data-testid="listen-back-duration">
        {duration === null ? '–:--' : formatTime(duration)}
      </span>
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
