import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ActionRow } from '../ActionRow';
import messages from '../../../../../../messages/en.json';

vi.mock('../../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

afterEach(() => {
  cleanup();
});

const renderRow = (props: React.ComponentProps<typeof ActionRow>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ActionRow {...props} />
    </NextIntlClientProvider>
  );

describe('ActionRow', () => {
  it('points "Continue to ayah N+1" at the next ayah on a non-final ayah', () => {
    renderRow({ surahId: '1', surahName: 'Al-Fatihah', ayahNumber: 2, totalAyahs: 7 });
    const cont = screen.getByRole('link', { name: /continue to ayah 3/i });
    expect(cont).toHaveAttribute('href', '/practice/1/3');
  });

  it('shows "Finish surah" with a celebration query param on the final ayah', () => {
    renderRow({ surahId: '1', surahName: 'Al-Fatihah', ayahNumber: 7, totalAyahs: 7 });
    const finish = screen.getByRole('link', { name: /finish surah/i });
    expect(finish).toHaveAttribute('href', '/?completed=Al-Fatihah');
  });

  it('URL-encodes the surah name to keep multi-word names safe', () => {
    renderRow({ surahId: '2', surahName: 'Al-Baqarah', ayahNumber: 286, totalAyahs: 286 });
    const finish = screen.getByRole('link', { name: /finish surah/i });
    expect(finish).toHaveAttribute('href', '/?completed=Al-Baqarah');
  });

  it('keeps a "Try this ayah again" link to the same surah/ayah', () => {
    renderRow({ surahId: '1', surahName: 'Al-Fatihah', ayahNumber: 3, totalAyahs: 7 });
    const tryAgain = screen.getByRole('link', { name: /try this ayah again/i });
    expect(tryAgain).toHaveAttribute('href', '/practice/1/3');
  });

  it('renders no Save button — persistence is automatic via recordAttempt', () => {
    renderRow({ surahId: '1', surahName: 'Al-Fatihah', ayahNumber: 2, totalAyahs: 7 });
    // Defensive: a future regression that re-introduces the dead button
    // would fail here and force a deliberate UX decision rather than a
    // silent re-add.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
