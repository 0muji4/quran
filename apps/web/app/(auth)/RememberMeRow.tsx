import styles from '../styles/auth.module.css';

type Props = {
  disabled?: boolean;
};

// Sign-in row: "Remember me" checkbox + "Forgot password?" link.
// Both are UI-only this pass — remember-me persists nothing (its session
// behaviour needs its own DesignDoc) and password reset is deferred per
// ADR 0010, so the link is a disabled button styled like a link, matching
// the OAuth buttons' "coming soon" treatment.
export function RememberMeRow({ disabled }: Props) {
  return (
    <div className={styles.optionsRow}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          name="rememberMe"
          className={styles.checkbox}
          defaultChecked
          disabled={disabled}
        />
        Remember me on this device
      </label>
      <button
        type="button"
        className={styles.forgotLink}
        disabled
        aria-label="Forgot password? — coming soon"
      >
        Forgot password?
      </button>
    </div>
  );
}
