import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActionRow } from '../ActionRow';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ActionRow', () => {
  it('points "Continue to ayah N+1" at the next ayah on a non-final ayah', () => {
    render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={2} totalAyahs={7} />);
    const cont = screen.getByRole('link', { name: /continue to ayah 3/i });
    expect(cont).toHaveAttribute('href', '/practice/1/3');
  });

  it('shows "Finish surah" with a celebration query param on the final ayah', () => {
    render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={7} totalAyahs={7} />);
    const finish = screen.getByRole('link', { name: /finish surah/i });
    expect(finish).toHaveAttribute('href', '/?completed=Al-Fatihah');
  });

  it('URL-encodes the surah name to keep multi-word names safe', () => {
    render(<ActionRow surahId="2" surahName="Al-Baqarah" ayahNumber={286} totalAyahs={286} />);
    const finish = screen.getByRole('link', { name: /finish surah/i });
    expect(finish).toHaveAttribute('href', '/?completed=Al-Baqarah');
  });

  it('keeps a "Try this ayah again" link to the same surah/ayah', () => {
    render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={3} totalAyahs={7} />);
    const tryAgain = screen.getByRole('link', { name: /try this ayah again/i });
    expect(tryAgain).toHaveAttribute('href', '/practice/1/3');
  });

  describe('Save attempt', () => {
    it('shows the "Save attempt" button by default', () => {
      render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={2} totalAyahs={7} />);
      expect(screen.getByRole('button', { name: /save attempt/i })).toBeInTheDocument();
    });

    it('flips to "Saved to history" on click', () => {
      render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={2} totalAyahs={7} />);
      fireEvent.click(screen.getByRole('button', { name: /save attempt/i }));
      expect(screen.getByRole('button', { name: /saved to history/i })).toBeInTheDocument();
    });

    it('reverts to "Save attempt" after the confirmation timeout', () => {
      vi.useFakeTimers();
      render(<ActionRow surahId="1" surahName="Al-Fatihah" ayahNumber={2} totalAyahs={7} />);
      fireEvent.click(screen.getByRole('button', { name: /save attempt/i }));
      expect(screen.getByRole('button', { name: /saved to history/i })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(screen.getByRole('button', { name: /save attempt/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /saved to history/i })).not.toBeInTheDocument();
    });
  });
});
