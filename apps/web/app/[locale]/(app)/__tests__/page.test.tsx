import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';

import { LibraryClient } from '../library/LibraryClient';
import type { SurahSummary } from '../../../lib/types';
import messages from '../../../../messages/en.json';

const refreshMock = vi.fn();
vi.mock('../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: refreshMock })
}));

const mockSurahs: SurahSummary[] = [
  { id: '1', nameEn: 'Al-Fatihah', nameAr: 'الفاتحة', ayahCount: 7, revelationPlace: 'Meccan' },
  { id: '2', nameEn: 'Al-Baqarah', nameAr: 'البقرة', ayahCount: 286, revelationPlace: 'Medinan' },
  { id: '112', nameEn: 'Al-Ikhlas', nameAr: 'الإخلاص', ayahCount: 4, revelationPlace: 'Meccan' }
];

const renderLibrary = (props: React.ComponentProps<typeof LibraryClient>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LibraryClient {...props} />
    </NextIntlClientProvider>
  );

describe('Surah library', () => {
  beforeEach(() => {
    window.localStorage.clear();
    refreshMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the hero copy and the search input', () => {
    renderLibrary({ surahs: mockSurahs });

    expect(screen.getByRole('heading', { name: /Choose a surah to recite/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by surah name or number...')).toBeInTheDocument();
  });

  it('renders a card per surah with a link to the practice page', () => {
    renderLibrary({ surahs: mockSurahs });

    const fatihahLink = screen.getByRole('link', { name: /Al-Fatihah/i });
    expect(fatihahLink).toHaveAttribute('href', '/practice/1/1');
  });

  it('filters surahs by search query', async () => {
    const user = userEvent.setup();
    renderLibrary({ surahs: mockSurahs });

    const search = screen.getByPlaceholderText('Search by surah name or number...');
    await user.type(search, 'baqarah');

    expect(screen.getByRole('link', { name: /Al-Baqarah/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Al-Fatihah/i })).not.toBeInTheDocument();
  });

  it('filters surahs by revelation place', async () => {
    const user = userEvent.setup();
    renderLibrary({ surahs: mockSurahs });

    await user.click(screen.getByRole('button', { name: /Medina/i }));

    expect(screen.getByRole('link', { name: /Al-Baqarah/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Al-Fatihah/i })).not.toBeInTheDocument();
  });

  it('shows the All counter reflecting the total surah count', () => {
    renderLibrary({ surahs: mockSurahs });
    expect(screen.getByRole('button', { name: 'All 3' })).toBeInTheDocument();
  });

  it('renders an explicit error state when the surah fetch failed', () => {
    renderLibrary({ surahs: [], loadError: true });

    // The page no longer pretends the library is just empty; the failure
    // is announced and a recovery affordance is offered.
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't load the surah list/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // Continue / Suggested / search / filter / grid are suppressed in
    // the error state so the user isn't presented with controls that
    // can't do anything until the underlying fetch succeeds.
    expect(
      screen.queryByPlaceholderText('Search by surah name or number...')
    ).not.toBeInTheDocument();
  });

  it('triggers a server refresh when Retry is clicked in the error state', async () => {
    const user = userEvent.setup();
    renderLibrary({ surahs: [], loadError: true });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
