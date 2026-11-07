import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SideStats } from '../SideStats';
import messages from '../../../../../../messages/en.json';

const storage = vi.hoisted(() => ({
  getBestScore: vi.fn(),
  getAttemptsForToday: vi.fn()
}));

vi.mock('../../../../../lib/storage', () => storage);

const tree = (ayahNumber: number) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <SideStats surahId="1" ayahNumber={ayahNumber} durationMs={65_000} />
  </NextIntlClientProvider>
);

const valueOf = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

afterEach(() => {
  cleanup();
  storage.getBestScore.mockReset();
  storage.getAttemptsForToday.mockReset();
});

describe('SideStats', () => {
  it('shows the stored stats for the ayah', () => {
    storage.getBestScore.mockReturnValue({ score: 91, achievedAt: '' });
    storage.getAttemptsForToday.mockReturnValue([{}, {}]);

    render(tree(1));

    expect(valueOf('PERSONAL BEST')).toBe('91');
    expect(valueOf('ATTEMPTS TODAY')).toBe('2');
    expect(valueOf('DURATION')).toBe('1:05');
  });

  it('falls back to empty values when nothing is stored', () => {
    storage.getBestScore.mockReturnValue(null);
    storage.getAttemptsForToday.mockReturnValue([]);

    render(tree(1));

    expect(valueOf('PERSONAL BEST')).toBe('—');
    expect(valueOf('ATTEMPTS TODAY')).toBe('0');
  });

  it('reads the new ayah when the props change', () => {
    storage.getBestScore.mockImplementation((_surahId: string, ayah: number) =>
      ayah === 2 ? { score: 70, achievedAt: '' } : null
    );
    storage.getAttemptsForToday.mockReturnValue([]);
    const result = render(tree(1));

    result.rerender(tree(2));

    expect(storage.getBestScore).toHaveBeenLastCalledWith('1', 2);
    expect(valueOf('PERSONAL BEST')).toBe('70');
  });
});
