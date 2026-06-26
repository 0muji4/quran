import { afterEach, describe, it, expect } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { MetricCard } from '../MetricCard';
import messages from '../../../../../../messages/en.json';

afterEach(() => cleanup());

const renderMetric = (props: React.ComponentProps<typeof MetricCard>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MetricCard {...props} />
    </NextIntlClientProvider>
  );

describe('MetricCard', () => {
  it('renders the bar as an ARIA progressbar with valuenow + valuetext', () => {
    renderMetric({ kind: 'accuracy', value: 0.5 });
    const bar = screen.getByRole('progressbar', { name: /accuracy/i });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuetext', '50.0%');
  });

  it('marks an unscored metric with a textual valuetext and no valuenow', () => {
    renderMetric({ kind: 'characterMatch', value: null });
    const bar = screen.getByRole('progressbar', { name: /character match/i });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-valuetext', 'No score yet');
  });

  it('clamps oversized values into the 0..100 range for valuenow', () => {
    renderMetric({ kind: 'completeness', value: 1.4 });
    const bar = screen.getByRole('progressbar', { name: /completeness/i });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
