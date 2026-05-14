import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ScoreDial } from '../ScoreDial';

afterEach(() => cleanup());

describe('ScoreDial', () => {
  it('exposes the score as an aria-label on a single role="img" wrapper', () => {
    render(<ScoreDial score={58} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score: 58 out of 100');
  });

  it('rounds non-integer scores in the accessible name', () => {
    render(<ScoreDial score={72.4} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score: 72 out of 100');
  });

  it('describes a missing score for screen readers', () => {
    render(<ScoreDial score={null} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score not yet available');
  });

  it('hides the inner number+unit text from screen readers (covered by the wrapper label)', () => {
    const { container } = render(<ScoreDial score={58} />);
    // The visual center text is duplicated info; aria-hidden on the center
    // prevents AT from announcing "58 OUT OF 100" twice.
    const center = container.querySelector('[class*="scoreDialCenter"]');
    expect(center).toHaveAttribute('aria-hidden', 'true');
  });
});
