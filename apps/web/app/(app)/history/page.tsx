import { getCurrentSession } from '../../lib/session';
import { HistoryList } from './HistoryList';
import styles from '../../styles/history.module.css';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getCurrentSession();
  return (
    <>
      <header className={styles.hero}>
        <span className="eyebrow" aria-hidden="true">
          + Your tilawah journey
        </span>
        <h1>Recent attempts</h1>
        <p className={styles.heroDescription}>
          A log of your recent recitations and scores. Synced across your devices when you are
          signed in.
        </p>
      </header>
      <HistoryList signedIn={session !== null} />
    </>
  );
}
