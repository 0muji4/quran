import { AuthBrandPanel } from './AuthBrandPanel';
import { AuthForm } from './AuthForm';
import { AUTH_COPY, type AuthMode } from './copy';
import styles from '../styles/auth.module.css';

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

// Top-level composition for /sign-in and /sign-up: the dark brand panel
// plus the form panel (eyebrow / title / lede + the interactive AuthForm).
// Server component — AuthForm is the only client island.
export function AuthScreen({ mode, redirectTo }: Props) {
  const copy = AUTH_COPY[mode];

  return (
    <>
      <AuthBrandPanel />
      <div className={styles.formPanel}>
        <section className={styles.formColumn} aria-labelledby="auth-title">
          <p className={`eyebrow ${styles.eyebrow}`}>
            <span aria-hidden="true">✦</span> {copy.eyebrow}
          </p>
          <h1 id="auth-title" className={styles.title}>
            {copy.title}
          </h1>
          <p className={styles.lede}>{copy.lede}</p>
          <AuthForm mode={mode} redirectTo={redirectTo} />
        </section>
      </div>
    </>
  );
}
