import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ScoringErrorCard } from '../ScoringErrorCard';
import messages from '../../../../../messages/en.json';

afterEach(() => cleanup());

const renderCard = (props: React.ComponentProps<typeof ScoringErrorCard>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ScoringErrorCard {...props} />
    </NextIntlClientProvider>
  );

describe('ScoringErrorCard', () => {
  it('renders each reason as a bullet', () => {
    renderCard({
      reasons: [
        'Recording was 0.6 s — too short to score',
        'Background noise made transcription unclear'
      ],
      canReplay: false,
      onRecordAgain: () => {}
    });
    expect(screen.getByText(/0.6 s/)).toBeInTheDocument();
    expect(screen.getByText(/Background noise/)).toBeInTheDocument();
  });

  it('uses the default hint copy when none is provided', () => {
    renderCard({ reasons: [], canReplay: false, onRecordAgain: () => {} });
    expect(screen.getByText(/move closer to the microphone/i)).toBeInTheDocument();
  });

  it('lets callers override the hint copy', () => {
    renderCard({
      reasons: [],
      hint: 'Try recording in a quieter spot',
      canReplay: false,
      onRecordAgain: () => {}
    });
    expect(screen.getByText(/quieter spot/i)).toBeInTheDocument();
  });

  it('hides the Replay button when canReplay is false', () => {
    renderCard({ reasons: [], canReplay: false, onRecordAgain: () => {} });
    expect(
      screen.queryByRole('button', { name: /replay your recording/i })
    ).not.toBeInTheDocument();
  });

  it('shows and wires the Replay button when canReplay is true', () => {
    const onReplay = vi.fn();
    renderCard({ reasons: [], canReplay: true, onReplay, onRecordAgain: () => {} });
    fireEvent.click(screen.getByRole('button', { name: /replay your recording/i }));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('wires the Record again button', () => {
    const onRecordAgain = vi.fn();
    renderCard({ reasons: [], canReplay: false, onRecordAgain });
    fireEvent.click(screen.getByRole('button', { name: /record again/i }));
    expect(onRecordAgain).toHaveBeenCalledTimes(1);
  });

  it('renders as an alert landmark for screen readers', () => {
    renderCard({ reasons: ['oops'], canReplay: false, onRecordAgain: () => {} });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
