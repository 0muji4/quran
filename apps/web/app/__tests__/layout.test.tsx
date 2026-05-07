import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { AppShell } from '../components/AppShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Tilawah brand and primary tabs', () => {
    render(
      <AppShell>
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
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('marks the active tab based on pathname', () => {
    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    );

    const surahTab = screen.getByRole('link', { name: 'Surah library' });
    expect(surahTab).toHaveAttribute('aria-current', 'page');

    const practiceTab = screen.getByRole('link', { name: 'Practice' });
    expect(practiceTab).not.toHaveAttribute('aria-current');
  });
});
