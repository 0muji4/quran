import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { HistoryList } from '../HistoryList';
import type { Attempt } from '../../../../lib/storage';

vi.mock('../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

const getRecentAttemptsMock = vi.fn<() => Attempt[]>();

vi.mock('../../../../lib/storage', () => ({
  getRecentAttempts: () => getRecentAttemptsMock()
}));

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
    const { rerender } = render(<HistoryList signedIn={false} />);
    expect(getRecentAttemptsMock).toHaveBeenCalledTimes(1);

    rerender(<HistoryList signedIn={true} />);
    expect(getRecentAttemptsMock).toHaveBeenCalledTimes(2);
  });

  it('re-reads attempts when the page becomes visible again', () => {
    render(<HistoryList signedIn={true} />);
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
    render(<HistoryList signedIn={true} />);
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

    const { rerender } = render(<HistoryList signedIn={false} />);
    expect(screen.queryByText('Al-Fatihah · ayah 1')).not.toBeInTheDocument();

    rerender(<HistoryList signedIn={true} />);
    expect(screen.getByText('Al-Fatihah · ayah 1')).toBeInTheDocument();
  });
});
