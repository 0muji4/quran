import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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
// URLSearchParams so the layout suite stays focused on TopNav rather
// than the toast itself.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}));

// AppShell renders <StorageSessionBridge> which writes to the shared
// storage module's signed-in gate. Stub the call so the layout test
// stays focused on TopNav rendering and doesn't pull the Server
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

  it('renders the Tilawah brand and primary tabs', () => {
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    expect(screen.getByText('Tilawah')).toBeInTheDocument();
    expect(screen.getByText('Recitation Practice')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Surah library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
  });

  it('renders children inside the main element', () => {
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('marks the active tab based on pathname', () => {
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    const surahTab = screen.getByRole('link', { name: 'Surah library' });
    expect(surahTab).toHaveAttribute('aria-current', 'page');

    const practiceTab = screen.getByRole('link', { name: 'Practice' });
    expect(practiceTab).not.toHaveAttribute('aria-current');
  });

  it('shows a Sign in link when no session is present', () => {
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('shows the avatar initial and Sign out button when signed in', () => {
    renderShell({
      session: { id: 'u1', email: 'a@b.co', displayName: 'Aisha' },
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    const avatar = screen.getByLabelText('Signed in as Aisha');
    expect(avatar).toHaveTextContent('A');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to the email initial when displayName is missing', () => {
    renderShell({
      session: { id: 'u1', email: 'b@c.co', displayName: null },
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    expect(screen.getByLabelText('Signed in as b@c.co')).toHaveTextContent('B');
  });

  it('points the Practice tab at Al-Fatihah 1:1 when no last-practiced ayah is cached', () => {
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice/1/1');
  });

  it('points the Practice tab at the last-practiced ayah after hydration', async () => {
    getLastPracticedMock.mockReturnValue({ surahId: '36', ayahNumber: 12 });
    renderShell({
      session: null,
      skipLinkLabel: messages.nav.skipToContent,
      children: <div>Test Content</div>
    });

    const tab = screen.getByRole('link', { name: 'Practice' });
    // useLocalStorageState hydrates in useEffect, so wait for the
    // post-mount href update.
    await waitFor(() => expect(tab).toHaveAttribute('href', '/practice/36/12'));
  });
});
