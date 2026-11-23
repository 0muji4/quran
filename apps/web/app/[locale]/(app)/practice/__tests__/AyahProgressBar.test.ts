import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { AyahProgressBar, clampAyah } from '../AyahProgressBar';

afterEach(() => cleanup());

describe('AyahProgressBar', () => {
  it('shows the ayah position as a progress element named by its label', () => {
    render(createElement(AyahProgressBar, { total: 7, current: 3, label: 'Ayah 3 of 7' }));

    const progress = screen.getByRole('progressbar', { name: 'Ayah 3 of 7' });
    expect(progress.tagName).toBe('PROGRESS');
    expect(progress).toHaveAttribute('value', '3');
    expect(progress).toHaveAttribute('max', '7');
  });

  it('renders nothing for an empty surah', () => {
    const { container } = render(
      createElement(AyahProgressBar, { total: 0, current: 1, label: 'Ayah 1 of 0' })
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('clampAyah', () => {
  it('keeps an ayah inside the surah', () => {
    expect(clampAyah(47, 286)).toBe(47);
  });

  it('clamps an out-of-range low ayah back to ayah 1', () => {
    expect(clampAyah(0, 7)).toBe(1);
  });

  it('clamps an out-of-range high ayah back to the final ayah', () => {
    expect(clampAyah(999, 7)).toBe(7);
  });
});
