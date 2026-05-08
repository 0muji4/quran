import styles from '../../styles/practice.module.css';
import type { VerdictBand } from './verdict';

type Props = {
  verdict: VerdictBand;
};

export function VerdictBlock({ verdict }: Props) {
  return (
    <div className={styles.verdictBlock}>
      <span className={styles.verdictBadge}>← {verdict.badge}</span>
      <h2 className={styles.verdictHeadline}>{verdict.headline}</h2>
      <p className={styles.verdictSubhead}>{verdict.subhead}</p>
    </div>
  );
}
