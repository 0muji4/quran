import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

afterEach(() => cleanup());

describe('MetricCard', () => {
  it('renders the bar as an ARIA progressbar with valuenow + valuetext', () => {
    render(<MetricCard label="Accuracy" value={0.5} description="how close" />);
    const bar = screen.getByRole('progressbar', { name: /accuracy/i });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuetext', '50.0%');
  });

  it('marks an unscored metric with a textual valuetext and no valuenow', () => {
    render(<MetricCard label="Fluency" value={null} description="rhythm" />);
    const bar = screen.getByRole('progressbar', { name: /fluency/i });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-valuetext', 'No score yet');
  });

  it('clamps oversized values into the 0..100 range for valuenow', () => {
    render(<MetricCard label="Completeness" value={1.4} description="coverage" />);
    const bar = screen.getByRole('progressbar', { name: /completeness/i });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
