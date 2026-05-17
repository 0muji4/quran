import { afterEach, describe, it, expect } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ScoreDial } from '../ScoreDial';
import messages from '../../../../../../messages/en.json';

afterEach(() => cleanup());

const renderDial = (props: React.ComponentProps<typeof ScoreDial>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ScoreDial {...props} />
    </NextIntlClientProvider>
  );

describe('ScoreDial', () => {
  it('exposes the score as an aria-label on a single role="img" wrapper', () => {
    renderDial({ score: 58 });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score: 58 out of 100');
  });

  it('rounds non-integer scores in the accessible name', () => {
    renderDial({ score: 72.4 });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score: 72 out of 100');
  });

  it('describes a missing score for screen readers', () => {
    renderDial({ score: null });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Score not yet available');
  });

  it('hides the inner number+unit text from screen readers (covered by the wrapper label)', () => {
    const { container } = renderDial({ score: 58 });
    // The visual center text is duplicated info; aria-hidden on the center
    // prevents AT from announcing "58 OUT OF 100" twice.
    const center = container.querySelector('[class*="scoreDialCenter"]');
    expect(center).toHaveAttribute('aria-hidden', 'true');
  });
});
