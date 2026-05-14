import type { ReactNode } from 'react';
import styles from '../styles/auth.module.css';

// The auth route group renders full-bleed with no TopNav — the two-panel
// sign-in / sign-up design owns the whole viewport. This layout still
// provides the <main> landmark that the root layout no longer supplies.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.viewport}>
      {children}
    </main>
  );
}
