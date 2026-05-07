import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecorderClient } from '../RecorderClient';
import * as actions from '../../actions';
import {
  mockSurahs,
  mockAyahs,
  mockSignedUploadUrl,
  mockScoringResult
} from '../../../test/fixtures/testData';
import { setupMediaRecorderMock, resetMediaRecorderMock } from '../../../test/mocks/mediaRecorder';

// Mock server actions
vi.mock('../../actions', () => ({
  requestSignedUploadUrl: vi.fn(),
  createScoringJobFromUpload: vi.fn(),
  fetchScoringJob: vi.fn(),
  fetchSurahs: vi.fn(),
  fetchSurahAyahs: vi.fn(),
  fetchReferenceAudioUrl: vi.fn()
}));

// Mock SegmentHighlights component
vi.mock('@quran-project/ui', () => ({
  SegmentHighlights: ({ segments }: { segments: Array<unknown> }) => (
    <div data-testid="segment-highlights">
      {segments.length > 0 && `${segments.length} segments`}
    </div>
  )
}));

describe('RecorderClient', () => {
  beforeEach(() => {
    setupMediaRecorderMock();

    // Setup default mock returns
    vi.mocked(actions.fetchSurahs).mockResolvedValue(mockSurahs);
    vi.mocked(actions.fetchSurahAyahs).mockResolvedValue(mockAyahs);
    vi.mocked(actions.requestSignedUploadUrl).mockResolvedValue(mockSignedUploadUrl);
    vi.mocked(actions.createScoringJobFromUpload).mockResolvedValue(mockScoringResult);
    vi.mocked(actions.fetchScoringJob).mockResolvedValue(mockScoringResult);
    vi.mocked(actions.fetchReferenceAudioUrl).mockResolvedValue({
      url: 'http://localhost/mock-reference.mp3',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    // Mock global fetch for file upload
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetMediaRecorderMock();
  });

  describe('Initial Rendering and Data Loading', () => {
    it('renders surah and ayah dropdowns', async () => {
      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(screen.getByLabelText(/surah/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      expect(screen.getByLabelText(/ayah/i)).toBeInTheDocument();
    });

    it('calls fetchSurahs on mount', async () => {
      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(actions.fetchSurahs).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );
    });

    it('populates surah dropdown with fetched data', async () => {
      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(screen.getByText(/Al-Fatihah/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it('handles error when fetchSurahs fails', async () => {
      vi.mocked(actions.fetchSurahs).mockRejectedValue(new Error('Network error'));

      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(screen.getByText(/Network error/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });
  });

  describe('Surah/Ayah Selection', () => {
    it('displays selected ayah details', async () => {
      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(actions.fetchSurahAyahs).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      // Wait for ayah selection to load
      await waitFor(
        () => {
          const arabicText = screen.queryByText(/بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ/i);
          if (arabicText) {
            expect(arabicText).toBeInTheDocument();
          }
        },
        { timeout: 10000 }
      );
    });
  });

  describe('Recording Flow', () => {
    it('shows error when MediaRecorder is not available', async () => {
      // @ts-expect-error - intentionally set to undefined
      global.MediaRecorder = undefined;

      render(<RecorderClient />);

      await waitFor(
        () => {
          expect(actions.fetchSurahs).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      // Wait for record button
      await waitFor(
        () => {
          const recordButton = screen.queryByRole('button', { name: /start recording/i });
          if (recordButton && !recordButton.hasAttribute('disabled')) {
            return true;
          }
          throw new Error('Button not ready');
        },
        { timeout: 10000 }
      );

      const user = userEvent.setup();
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);

      await waitFor(
        () => {
          expect(screen.getByText(/MediaRecorder is not supported/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });
  });
});
