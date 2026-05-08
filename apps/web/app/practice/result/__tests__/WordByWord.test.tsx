import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { WordAlignment } from '@quran-project/shared-ts';
import { WordByWord } from '../WordByWord';

afterEach(() => cleanup());

const alignments: WordAlignment[] = [
  { op: 'equal', refWord: 'بِسْمِ', hypWord: 'بِسْمِ' },
  { op: 'substitute', refWord: 'الله', hypWord: 'إله' },
  { op: 'delete', refWord: 'الرَّحْمَٰنِ', hypWord: null },
  { op: 'insert', refWord: null, hypWord: 'كان' }
];

describe('WordByWord', () => {
  it('renders both EXPECTED and WHAT WE HEARD rows', () => {
    render(<WordByWord wordAlignments={alignments} wer={0.5} />);
    expect(screen.getByText('EXPECTED (TEACHER)')).toBeInTheDocument();
    expect(screen.getByText('WHAT WE HEARD')).toBeInTheDocument();
  });

  it('formats WER as percent', () => {
    const { container } = render(<WordByWord wordAlignments={alignments} wer={0.5} />);
    // The percentage is in the dedicated WER span; getByText would also match
    // the wrapping <p>, so query the leaf span directly.
    const werNode = container.querySelector('p span');
    expect(werNode?.textContent).toBe('50.0%');
  });

  it('shows em-dash when WER is null', () => {
    const { container } = render(<WordByWord wordAlignments={alignments} wer={null} />);
    const werNode = container.querySelector('p span');
    expect(werNode?.textContent).toBe('—');
  });

  it('falls back to "…" placeholder for missing words', () => {
    render(<WordByWord wordAlignments={alignments} wer={0.5} />);
    // delete op has no hypWord; insert op has no refWord.
    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(2);
  });

  it('renders a single combined empty-state copy when there are no alignments', () => {
    render(<WordByWord wordAlignments={[]} wer={null} />);
    expect(
      screen.getByText(/Word-level alignment is not available for this attempt yet/)
    ).toBeInTheDocument();
    // Section labels are not rendered in the empty branch.
    expect(screen.queryByText('EXPECTED (TEACHER)')).not.toBeInTheDocument();
    expect(screen.queryByText('WHAT WE HEARD')).not.toBeInTheDocument();
  });
});
