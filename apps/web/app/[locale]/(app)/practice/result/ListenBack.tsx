'use client';

import { useRef, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../../../styles/practice.module.css';

type Props = {
  teacherUrl: string | null;
  userRecordingUrl: string | null;
  teacherLabel?: string;
};

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

function ListenBackTile({
  audioRef,
  kind,
  title,
  subtitle,
  src,
  fallback
}: {
  audioRef: Ref<HTMLAudioElement>;
  kind: 'teacher' | 'user';
  title: string;
  subtitle: string;
  src: string;
  fallback: string;
}) {
  const tileClass =
    kind === 'teacher'
      ? `${styles.listenBackTile} ${styles.listenBackTileTeacher}`
      : `${styles.listenBackTile} ${styles.listenBackTileUser}`;
  return (
    <div className={tileClass}>
      <div className={styles.listenBackTileHead}>
        <span className={styles.listenBackTileTitle}>{title}</span>
        <span className={styles.listenBackTileSubtitle}>{subtitle}</span>
      </div>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={src}
        className={styles.listenBackAudio}
      >
        {fallback}
      </audio>
    </div>
  );
}
