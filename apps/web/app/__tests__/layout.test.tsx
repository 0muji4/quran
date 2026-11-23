import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { AppShell } from '../components/AppShell';
import messages from '../../messages/en.json';

vi.mock('../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

// AppShell renders WelcomeBackToast, which reads `?welcome-back=1`
// via `useSearchParams` from next/navigation. Stub it to an empty
// URLSearchParams so the layout suite stays focused on the navigation
// rather than the toast itself.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}));

// AppShell renders <StorageSessionBridge> which writes to the shared
// storage module's signed-in gate. Stub the call so the layout test
// stays focused on the navigation and doesn't pull the Server
// Actions module in for nothing.
const getLastPracticedMock = vi.fn(() => null as null | { surahId: string; ayahNumber: number });
vi.mock('../lib/storage', () => ({
  setSignedInGate: vi.fn(),
  clearLocalCache: vi.fn(),
  getLastPracticed: () => getLastPracticedMock()
}));

const renderShell = (props: React.ComponentProps<typeof AppShell>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppShell {...props} />
    </NextIntlClientProvider>
  );

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
    getLastPracticedMock.mockReset();
    getLastPracticedMock.mockReturnValue(null);
  });

  const renderDefault = () =>
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

  it('renders the four destinations in the primary navigation', () => {
    renderDefault();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Library',
      'Practice',
      'History',
      'Profile'
    ]);
    expect(within(nav).getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
  });

  it('renders children inside the main element', () => {
    renderDefault();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('marks the current destination based on pathname', () => {
    renderDefault();

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
  });

  it('points Practice at Al-Fatihah 1:1 when no last-practiced ayah is cached', () => {
    renderDefault();

    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice/1/1');
  });

  it('points Practice at the last-practiced ayah after hydration', async () => {
    getLastPracticedMock.mockReturnValue({ surahId: '36', ayahNumber: 12 });
    renderDefault();

    const tab = screen.getByRole('link', { name: 'Practice' });
    // useLocalStorageState hydrates in useEffect, so wait for the
    // post-mount href update.
    await waitFor(() => expect(tab).toHaveAttribute('href', '/practice/36/12'));
  });
});
