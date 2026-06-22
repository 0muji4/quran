import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PracticePreferencesCard } from '../PracticePreferencesCard';
import { updatePreferencesAction } from '../../../../actions';
import type { PracticePreferences } from '../../../../lib/preferences';
import messages from '../../../../../messages/en.json';

vi.mock('../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

vi.mock('../../../../actions', () => ({
  updatePreferencesAction: vi.fn()
}));

const PREFS: PracticePreferences = {
  referenceReciterId: 'husary-muallim',
  defaultPlaybackSpeed: 1,
  dailyReminderEnabled: false,
  dailyReminderTime: '08:00'
};

const renderCard = (preferences: PracticePreferences = PREFS) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PracticePreferencesCard preferences={preferences} />
    </NextIntlClientProvider>
  );

afterEach(() => {
  cleanup();
  vi.mocked(updatePreferencesAction).mockReset();
});

describe('PracticePreferencesCard', () => {
  it('renders the stored preferences', () => {
    renderCard({
      ...PREFS,
      defaultPlaybackSpeed: 1.25,
      dailyReminderEnabled: true,
      dailyReminderTime: '07:30'
    });

    expect(screen.getByLabelText('Reference reciter')).toHaveValue('husary-muallim');
    expect(screen.getByLabelText('Default playback speed')).toHaveValue('1.25');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('persists a reminder toggle via updatePreferencesAction', async () => {
    vi.mocked(updatePreferencesAction).mockResolvedValue({ ...PREFS, dailyReminderEnabled: true });
    renderCard();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    expect(updatePreferencesAction).toHaveBeenCalledWith({ dailyReminderEnabled: true });
  });

  it('persists a playback-speed change', async () => {
    vi.mocked(updatePreferencesAction).mockResolvedValue({ ...PREFS, defaultPlaybackSpeed: 1.5 });
    renderCard();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Default playback speed'), {
        target: { value: '1.5' }
      });
    });

    expect(updatePreferencesAction).toHaveBeenCalledWith({ defaultPlaybackSpeed: 1.5 });
  });

  it('reverts and surfaces an error when the save fails', async () => {
    vi.mocked(updatePreferencesAction).mockRejectedValue(new Error('nope'));
    renderCard();

    fireEvent.click(screen.getByRole('switch'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
