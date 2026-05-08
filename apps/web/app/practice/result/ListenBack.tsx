import styles from '../../styles/practice.module.css';

type Props = {
  teacherUrl: string | null;
  userRecordingUrl: string | null;
  teacherLabel?: string;
};

// Side-by-side playback so the user can compare their recitation against the
// teacher's reference. Both URLs are presigned and short-lived (~1h); if one
// is missing we hide that side rather than rendering a broken control.
export function ListenBack({
  teacherUrl,
  userRecordingUrl,
  teacherLabel = "Husary Mu'allim · slow reference"
}: Props) {
  if (!teacherUrl && !userRecordingUrl) return null;

  return (
    <section className={styles.listenBackSection} aria-labelledby="listen-back-heading">
      <header className={styles.listenBackHead}>
        <div>
          <h2 id="listen-back-heading" className={styles.listenBackTitle}>
            Listen back
          </h2>
          <p className={styles.listenBackSubtitle}>
            Compare your recitation with the teacher&apos;s reference.
          </p>
        </div>
      </header>

      <div className={styles.listenBackGrid}>
        {teacherUrl ? (
          <ListenBackTile kind="teacher" title="Teacher" subtitle={teacherLabel} src={teacherUrl} />
        ) : null}
        {userRecordingUrl ? (
          <ListenBackTile
            kind="user"
            title="Your recitation"
            subtitle="just now"
            src={userRecordingUrl}
          />
        ) : (
          <div className={`${styles.listenBackTile} ${styles.listenBackTileMuted}`}>
            <div className={styles.listenBackTileHead}>
              <span className={styles.listenBackTileTitle}>Your recitation</span>
              <span className={styles.listenBackTileSubtitle}>not available</span>
            </div>
            <p className={styles.listenBackEmpty}>
              The recording is no longer accessible. Try recording again to get a fresh comparison.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ListenBackTile({
  kind,
  title,
  subtitle,
  src
}: {
  kind: 'teacher' | 'user';
  title: string;
  subtitle: string;
  src: string;
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
      <audio controls preload="metadata" src={src} className={styles.listenBackAudio}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
