import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { AppShell } from '../components/AppShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

// AppShell renders <StorageSessionBridge> which writes to the shared
// storage module's signed-in gate. Stub the call so the layout test
// stays focused on TopNav rendering and doesn't pull the Server
// Actions module in for nothing.
vi.mock('../lib/storage', () => ({
  setSignedInGate: vi.fn()
}));

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Tilawah brand and primary tabs', () => {
    render(
      <AppShell session={null}>
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByText('Tilawah')).toBeInTheDocument();
    expect(screen.getByText('Recitation Practice')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Surah library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
  });

  it('renders children inside the main element', () => {
    render(
      <AppShell session={null}>
        <div>Test Content</div>
      </AppShell>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('marks the active tab based on pathname', () => {
    render(
      <AppShell session={null}>
        <div>Test Content</div>
      </AppShell>
    );

    const surahTab = screen.getByRole('link', { name: 'Surah library' });
    expect(surahTab).toHaveAttribute('aria-current', 'page');

    const practiceTab = screen.getByRole('link', { name: 'Practice' });
    expect(practiceTab).not.toHaveAttribute('aria-current');
  });

  it('shows a Sign in link when no session is present', () => {
    render(
      <AppShell session={null}>
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('shows the avatar initial and Sign out button when signed in', () => {
    render(
      <AppShell session={{ id: 'u1', email: 'a@b.co', displayName: 'Aisha' }}>
        <div>Test Content</div>
      </AppShell>
    );

    const avatar = screen.getByLabelText('Signed in as Aisha');
    expect(avatar).toHaveTextContent('A');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to the email initial when displayName is missing', () => {
    render(
      <AppShell session={{ id: 'u1', email: 'b@c.co', displayName: null }}>
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByLabelText('Signed in as b@c.co')).toHaveTextContent('B');
  });
});
