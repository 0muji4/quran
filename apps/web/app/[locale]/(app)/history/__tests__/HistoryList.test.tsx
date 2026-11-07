import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { HistoryList } from '../HistoryList';
import type { Attempt } from '../../../../lib/storage';
import messages from '../../../../../messages/en.json';

vi.mock('../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

const getRecentAttemptsMock = vi.fn<() => Attempt[]>();

vi.mock('../../../../lib/storage', () => ({
  getRecentAttempts: () => getRecentAttemptsMock()
}));

// Inline playback calls this server action lazily on click; the refresh
// tests never click play, so a stub keeps the server module out of jsdom.
vi.mock('../../../../actions', () => ({
  fetchScoringJob: vi.fn()
}));

const renderList = (signedIn: boolean) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HistoryList signedIn={signedIn} />
    </NextIntlClientProvider>
  );

const rerenderList = (result: ReturnType<typeof renderList>, signedIn: boolean): void => {
  result.rerender(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HistoryList signedIn={signedIn} />
    </NextIntlClientProvider>
  );
};

const attemptFixture = (id: string): Attempt => ({
  id,
  surahId: '1',
  surahNameEn: 'Al-Fatihah',
  ayahNumber: 1,
  score: 80,
  jobId: `job-${id}`,
  createdAt: new Date('2026-05-16T12:00:00Z').toISOString(),
  status: 'COMPLETED'
});

afterEach(() => {
  cleanup();
  getRecentAttemptsMock.mockReset();
});

describe('HistoryList refresh behaviour', () => {
  beforeEach(() => {
    getRecentAttemptsMock.mockReturnValue([]);
  });

  it('re-reads attempts when signedIn flips from false to true', () => {
    const result = renderList(false);
    expect(getRecentAttemptsMock).toHaveBeenCalledTimes(1);

    rerenderList(result, true);
    expect(getRecentAttemptsMock).toHaveBeenCalledTimes(2);
  });

  it('re-reads attempts when the page becomes visible again', () => {
    renderList(true);
    const initialCalls = getRecentAttemptsMock.mock.calls.length;

    // Simulate a tab-blur → tab-return without changing any props.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible'
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(getRecentAttemptsMock.mock.calls.length).toBe(initialCalls + 1);
  });

  it('does NOT re-read when visibilitychange fires while hidden', () => {
    renderList(true);
    const initialCalls = getRecentAttemptsMock.mock.calls.length;

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden'
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(getRecentAttemptsMock.mock.calls.length).toBe(initialCalls);
  });

  it('renders the latest attempt list after a re-read', () => {
    // First read returns nothing; the second returns one attempt.
    getRecentAttemptsMock.mockReturnValueOnce([]).mockReturnValueOnce([attemptFixture('a1')]);

    const result = renderList(false);
    expect(screen.queryByText('Al-Fatihah · ayah 1')).not.toBeInTheDocument();

    rerenderList(result, true);
    expect(screen.getByText('Al-Fatihah · ayah 1')).toBeInTheDocument();
  });
});

describe('HistoryList weekly scope', () => {
  const NOW = new Date('2026-05-20T12:00:00Z').getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const attemptAt = (id: string, at: number): Attempt => ({
    ...attemptFixture(id),
    createdAt: new Date(at).toISOString()
  });

  const attemptsTile = () =>
    screen.getByText('Attempts').parentElement?.textContent?.match(/\d+/)?.[0];

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    // A fresh array per read, as the real getter parses it from storage.
    getRecentAttemptsMock.mockImplementation(() => [
      attemptAt('recent', NOW - DAY_MS),
      attemptAt('old', NOW - 6.5 * DAY_MS),
      attemptAt('older', NOW - 30 * DAY_MS)
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts only the last seven days until lifetime is selected', () => {
    renderList(true);
    expect(attemptsTile()).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Lifetime' }));
    expect(attemptsTile()).toBe('3');
  });

  it('moves the week forward when the scope changes', () => {
    renderList(true);
    fireEvent.click(screen.getByRole('button', { name: 'Lifetime' }));

    vi.setSystemTime(NOW + DAY_MS);
    fireEvent.click(screen.getByRole('button', { name: 'This week' }));

    expect(attemptsTile()).toBe('1');
  });

  it('moves the week forward when the page becomes visible again', () => {
    renderList(true);
    expect(attemptsTile()).toBe('2');

    vi.setSystemTime(NOW + DAY_MS);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible'
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(attemptsTile()).toBe('1');
  });
});
