import styles from '../styles/auth.module.css';

type Props = {
  label: string;
};

// "OR" / "OR WITH EMAIL" rule. The rule lines are drawn in CSS; only the
// label is real text.
export function Divider({ label }: Props) {
  return (
    <div className={styles.divider}>
      <span className={styles.dividerLabel}>{label}</span>
    </div>
  );
}
