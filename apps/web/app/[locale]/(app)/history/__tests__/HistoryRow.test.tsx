import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { HistoryRow } from '../HistoryRow';
import type { Attempt } from '../../../../lib/storage';
import messages from '../../../../../messages/en.json';

vi.mock('../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

afterEach(cleanup);

const attempt: Attempt = {
  id: 'a1',
  surahId: '36',
  surahNameEn: 'Ya-Sin',
  ayahNumber: 3,
  score: 87,
  jobId: 'job-a1',
  createdAt: '2026-05-16T12:00:00.000Z',
  status: 'COMPLETED'
};

const renderRow = (props: Partial<React.ComponentProps<typeof HistoryRow>> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HistoryRow
        attempt={attempt}
        meta="Today · 14:02"
        trend={[]}
        playback="idle"
        onPlay={() => {}}
        {...props}
      />
    </NextIntlClientProvider>
  );

describe('HistoryRow', () => {
  it('links to the ayah and names it, when it was recited and the score', () => {
    renderRow();
    const link = screen.getByRole('link', {
      name: /^Ya-Sin · ayah 3\s*,\s*Today · 14:02\s*,\s*Score 87$/
    });
    expect(link).toHaveAttribute('href', '/practice/36/3');
  });

  it('shows the surah number', () => {
    renderRow();
    expect(screen.getByText('36')).toBeInTheDocument();
  });

  it.each([
    [70, 'pass'],
    [69, 'warn'],
    [40, 'warn'],
    [39, 'fail']
  ])('draws a score of %i in the %s tone', (score, tone) => {
    renderRow({ attempt: { ...attempt, score } });
    expect(screen.getByText(String(score)).closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      tone
    );
  });

  it('shows a dash for an attempt that failed to score', () => {
    renderRow({ attempt: { ...attempt, status: 'FAILED', score: null } });
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Failed attempt$/ })).toBeInTheDocument();
  });

  it('says in the row that a recording cannot be played', () => {
    renderRow({ playback: 'error' });
    expect(screen.getByText('Recording unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Today · 14:02')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recording unavailable' })).toBeEnabled();
  });

  it.each([
    ['idle', 'Play your recitation', false],
    ['playing', 'Pause recitation', false],
    ['loading', 'Loading recording…', true]
  ] as const)('names its button for the %s state', (playback, name, disabled) => {
    const onPlay = vi.fn();
    renderRow({ playback, onPlay });
    const button = screen.getByRole('button', { name });
    fireEvent.click(button);
    expect(onPlay).toHaveBeenCalledTimes(disabled ? 0 : 1);
  });
});
