import { LEVEL_OPTIONS } from './copy';
import styles from '../styles/auth.module.css';

type Props = {
  disabled?: boolean;
};

// Sign-up "current level" picker. Native radios in a fieldset — the card
// styling is driven entirely by CSS (:has(:checked)), so no client state
// is needed. UI-only this pass: the value rides along in the form but is
// not read by the submit handler (see plan / copy.ts).
export function LevelSelector({ disabled }: Props) {
  return (
    <fieldset className={styles.levelGroup} disabled={disabled}>
      <legend className={styles.levelLegend}>
        Your current level{' '}
        <span className={styles.levelLegendHint}>(you can change this later)</span>
      </legend>
      <div className={styles.levelGrid}>
        {LEVEL_OPTIONS.map((option, index) => (
          <label key={option.value} className={styles.levelCard}>
            <input
              type="radio"
              name="level"
              value={option.value}
              defaultChecked={index === 0}
              className={styles.levelRadio}
            />
            <span className={styles.levelCardText}>
              <span className={styles.levelCardTitle}>{option.label}</span>
              <span className={styles.levelCardSubtitle}>{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
