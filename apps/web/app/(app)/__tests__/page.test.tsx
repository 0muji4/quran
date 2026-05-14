import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LibraryClient } from '../library/LibraryClient';
import type { SurahSummary } from '../../lib/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

const mockSurahs: SurahSummary[] = [
  { id: '1', nameEn: 'Al-Fatihah', nameAr: 'الفاتحة', ayahCount: 7, revelationPlace: 'Meccan' },
  { id: '2', nameEn: 'Al-Baqarah', nameAr: 'البقرة', ayahCount: 286, revelationPlace: 'Medinan' },
  { id: '112', nameEn: 'Al-Ikhlas', nameAr: 'الإخلاص', ayahCount: 4, revelationPlace: 'Meccan' }
];

describe('Surah library', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the hero copy and the search input', () => {
    render(<LibraryClient surahs={mockSurahs} />);

    expect(screen.getByRole('heading', { name: /Choose a surah to recite/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by surah name or number...')).toBeInTheDocument();
  });

  it('renders a card per surah with a link to the practice page', () => {
    render(<LibraryClient surahs={mockSurahs} />);

    const fatihahLink = screen.getByRole('link', { name: /Al-Fatihah/i });
    expect(fatihahLink).toHaveAttribute('href', '/practice/1/1');
  });

  it('filters surahs by search query', async () => {
    const user = userEvent.setup();
    render(<LibraryClient surahs={mockSurahs} />);

    const search = screen.getByPlaceholderText('Search by surah name or number...');
    await user.type(search, 'baqarah');

    expect(screen.getByRole('link', { name: /Al-Baqarah/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Al-Fatihah/i })).not.toBeInTheDocument();
  });

  it('filters surahs by revelation place', async () => {
    const user = userEvent.setup();
    render(<LibraryClient surahs={mockSurahs} />);

    await user.click(screen.getByRole('button', { name: /Medina/i }));

    expect(screen.getByRole('link', { name: /Al-Baqarah/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Al-Fatihah/i })).not.toBeInTheDocument();
  });

  it('shows the All counter reflecting the total surah count', () => {
    render(<LibraryClient surahs={mockSurahs} />);
    expect(screen.getByRole('button', { name: 'All 3' })).toBeInTheDocument();
  });
});
