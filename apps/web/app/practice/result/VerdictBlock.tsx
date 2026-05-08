import styles from '../../styles/practice.module.css';
import { AutoFocusHeading } from './AutoFocusHeading';
import type { VerdictBand } from './verdict';

type Props = {
  verdict: VerdictBand;
};

export function VerdictBlock({ verdict }: Props) {
  return (
    <div className={styles.verdictBlock}>
      <span className={styles.verdictBadge}>
        <span aria-hidden="true">← </span>
        {verdict.badge}
      </span>
      <AutoFocusHeading className={styles.verdictHeadline}>{verdict.headline}</AutoFocusHeading>
      <p className={styles.verdictSubhead}>{verdict.subhead}</p>
    </div>
  );
}
