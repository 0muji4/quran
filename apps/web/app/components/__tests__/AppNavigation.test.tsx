import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AppNavigation } from '../AppNavigation';
import messages from '../../../messages/en.json';

const nav = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('../../../i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => nav.pathname
}));

vi.mock('../../lib/storage', () => ({ getLastPracticed: () => null }));

afterEach(cleanup);

const currentDestination = (pathname: string): string | null => {
  nav.pathname = pathname;
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppNavigation />
    </NextIntlClientProvider>
  );
  const current = screen
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page');
  return current?.textContent ?? null;
};

describe('AppNavigation', () => {
  it.each([
    ['/', 'Library'],
    ['/practice/1/1', 'Practice'],
    ['/history', 'History'],
    ['/profile', 'Profile'],
    ['/sign-in', 'Profile'],
    ['/sign-up', 'Profile']
  ])('marks the destination of %s as current', (pathname, label) => {
    expect(currentDestination(pathname)).toBe(label);
  });
});
