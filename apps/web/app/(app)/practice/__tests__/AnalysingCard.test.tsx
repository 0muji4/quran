import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AnalysingCard } from '../AnalysingCard';

afterEach(() => cleanup());

const itemFor = (container: HTMLElement, label: string): HTMLElement => {
  const items = Array.from(container.querySelectorAll('li')) as HTMLElement[];
  const match = items.find((el) => el.textContent?.includes(label));
  if (!match) throw new Error(`Checklist item not found: ${label}`);
  return match;
};

const status = (el: HTMLElement): 'done' | 'active' | 'pending' => {
  const cls = el.className;
  if (cls.includes('checklistItemDone')) return 'done';
  if (cls.includes('checklistItemActive')) return 'active';
  return 'pending';
};

describe('AnalysingCard checklist progression', () => {
  it('shows step 1 active and the rest pending immediately', () => {
    const { container } = render(<AnalysingCard elapsedMs={0} />);
    expect(status(itemFor(container, 'Transcribing audio'))).toBe('active');
    expect(status(itemFor(container, 'Comparing to reference'))).toBe('pending');
    expect(status(itemFor(container, 'Calculating your score'))).toBe('pending');
  });

  it('keeps step 1 active just before the 4s threshold', () => {
    const { container } = render(<AnalysingCard elapsedMs={3_999} />);
    expect(status(itemFor(container, 'Transcribing audio'))).toBe('active');
    expect(status(itemFor(container, 'Comparing to reference'))).toBe('pending');
  });

  it('flips step 1 to done and step 2 to active at 4s', () => {
    const { container } = render(<AnalysingCard elapsedMs={4_000} />);
    expect(status(itemFor(container, 'Transcribing audio'))).toBe('done');
    expect(status(itemFor(container, 'Comparing to reference'))).toBe('active');
    expect(status(itemFor(container, 'Calculating your score'))).toBe('pending');
  });

  it('keeps step 2 active just before the 8s threshold', () => {
    const { container } = render(<AnalysingCard elapsedMs={7_999} />);
    expect(status(itemFor(container, 'Comparing to reference'))).toBe('active');
    expect(status(itemFor(container, 'Calculating your score'))).toBe('pending');
  });

  it('marks the first two done and step 3 active at 8s', () => {
    const { container } = render(<AnalysingCard elapsedMs={8_000} />);
    expect(status(itemFor(container, 'Transcribing audio'))).toBe('done');
    expect(status(itemFor(container, 'Comparing to reference'))).toBe('done');
    expect(status(itemFor(container, 'Calculating your score'))).toBe('active');
  });

  it('renders the supporting copy', () => {
    const { container } = render(<AnalysingCard elapsedMs={2_000} />);
    expect(container.textContent).toContain('This usually takes a few seconds');
  });
});
