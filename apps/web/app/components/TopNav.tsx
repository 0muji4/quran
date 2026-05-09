'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon } from './icons/BookIcon';
import styles from '../styles/nav.module.css';

type Tab = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { href: '/', label: 'Surah library', match: (p) => p === '/' || p.startsWith('/library') },
  {
    href: '/practice',
    label: 'Practice',
    match: (p) => p.startsWith('/practice') || p.startsWith('/record')
  },
  { href: '/history', label: 'History', match: (p) => p.startsWith('/history') }
];

type Props = {
  userInitial?: string;
};

export function TopNav({ userInitial = 'N' }: Props) {
  const pathname = usePathname() ?? '/';

  return (
    <nav className={styles.nav} aria-label="Primary">
      <Link href="/" className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden="true">
          <BookIcon size={22} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandTitle}>Tilawah</span>
          <span className={styles.brandSubtitle}>Recitation Practice</span>
        </span>
      </Link>

      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className={styles.profile}>
        <span className={styles.avatar} aria-label={`Signed in as ${userInitial}`}>
          {userInitial}
        </span>
      </div>
    </nav>
  );
}
