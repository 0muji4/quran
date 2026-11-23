import { afterEach, describe, it, expect } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { WordAlignment } from '@quran-project/shared-ts';
import { WordByWord } from '../WordByWord';
import messages from '../../../../../../messages/en.json';

afterEach(() => cleanup());

const renderWords = (props: React.ComponentProps<typeof WordByWord>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <WordByWord {...props} />
    </NextIntlClientProvider>
  );

const alignments: WordAlignment[] = [
  { op: 'equal', refWord: 'بِسْمِ', hypWord: 'بِسْمِ' },
  { op: 'substitute', refWord: 'الله', hypWord: 'إله' },
  { op: 'delete', refWord: 'الرَّحْمَٰنِ', hypWord: null },
  { op: 'insert', refWord: null, hypWord: 'كان' }
];

const tileOf = (word: string) => screen.getByText(word).parentElement;

describe('WordByWord', () => {
  it('draws one tile per alignment in a single row, with its kind', () => {
    renderWords({ wordAlignments: alignments, wer: 0.5 });
    expect(tileOf('بِسْمِ')).toHaveAttribute('data-kind', 'match');
    expect(tileOf('الله')).toHaveAttribute('data-kind', 'substitution');
    expect(tileOf('الرَّحْمَٰنِ')).toHaveAttribute('data-kind', 'missing');
    expect(tileOf('كان')).toHaveAttribute('data-kind', 'inserted');
  });

  it('writes what was heard under a substituted word', () => {
    renderWords({ wordAlignments: alignments, wer: 0.5 });
    expect(tileOf('الله')).toHaveTextContent('heard إله');
  });

  it('names missing and extra words on their tiles', () => {
    renderWords({ wordAlignments: alignments, wer: 0.5 });
    expect(tileOf('الرَّحْمَٰنِ')).toHaveTextContent('Missing');
    expect(tileOf('كان')).toHaveTextContent('Extra');
  });

  it('lists every kind in the legend', () => {
    renderWords({ wordAlignments: alignments, wer: 0.5 });
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(legend).toHaveTextContent('MatchSubstitutionMissingExtra');
  });

  it('formats WER as percent', () => {
    const { container } = renderWords({ wordAlignments: alignments, wer: 0.5 });
    // The percentage is in the dedicated WER span; getByText would also match
    // the wrapping <p>, so query the leaf span directly.
    const werNode = container.querySelector('p span');
    expect(werNode?.textContent).toBe('50.0%');
  });

  it('shows em-dash when WER is null', () => {
    const { container } = renderWords({ wordAlignments: alignments, wer: null });
    const werNode = container.querySelector('p span');
    expect(werNode?.textContent).toBe('—');
  });

  it('renders a single combined empty-state copy when there are no alignments', () => {
    renderWords({ wordAlignments: [], wer: null });
    expect(
      screen.getByText(/Word-level alignment is not available for this attempt yet/)
    ).toBeInTheDocument();
    // Neither tiles nor the legend are rendered in the empty branch.
    expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
  });
});
