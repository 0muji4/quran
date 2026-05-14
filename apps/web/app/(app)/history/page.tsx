import { HistoryList } from './HistoryList';
import styles from '../../styles/history.module.css';

export const dynamic = 'force-static';

export default function HistoryPage() {
  return (
    <>
      <header className={styles.hero}>
        <span className="eyebrow" aria-hidden="true">
          + Your tilawah journey
        </span>
        <h1>Recent attempts</h1>
        <p className={styles.heroDescription}>
          A log of your recent recitations and scores. Stored locally in this browser.
        </p>
      </header>
      <HistoryList />
    </>
  );
}
