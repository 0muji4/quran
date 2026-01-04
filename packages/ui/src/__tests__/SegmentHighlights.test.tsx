import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentHighlights } from '../SegmentHighlights';
import type { ScoreSegment } from '@quran-project/shared-ts';

describe('SegmentHighlights', () => {
  afterEach(() => {
    cleanup();
  });

  const mockSegments: ScoreSegment[] = [
    {
      label: 'Word 1',
      score: 0.95,
      metrics: { duration: '500ms', confidence: 0.98 }
    },
    {
      label: 'Word 2',
      score: 0.78,
      metrics: null
    },
    {
      label: 'Word 3',
      score: 0.65,
      metrics: { duration: '450ms' }
    }
  ];

  it('returns null for empty segments array', () => {
    const { container } = render(<SegmentHighlights segments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all segments with labels and scores', () => {
    render(<SegmentHighlights segments={mockSegments} />);

    expect(screen.getByText('Word 1')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();

    expect(screen.getByText('Word 2')).toBeInTheDocument();
    expect(screen.getByText('78.0%')).toBeInTheDocument();

    expect(screen.getByText('Word 3')).toBeInTheDocument();
    expect(screen.getByText('65.0%')).toBeInTheDocument();
  });

  it('formats scores as percentages with one decimal place', () => {
    const segments: ScoreSegment[] = [
      { label: 'Test1', score: 0.856, metrics: null },
      { label: 'Test2', score: 0.9, metrics: null },
      { label: 'Test3', score: 0.123, metrics: null }
    ];

    render(<SegmentHighlights segments={segments} />);

    expect(screen.getByText('85.6%')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('12.3%')).toBeInTheDocument();
  });

  it('applies correct color coding based on default threshold 0.8', () => {
    const { container } = render(<SegmentHighlights segments={mockSegments} />);

    const scores = container.querySelectorAll('span[style*="color"]');

    // Word 1: 0.95 >= 0.8 → green
    expect(scores[0]).toHaveStyle({ color: '#16a34a' });

    // Word 2: 0.78 >= 0.7 (0.8 - 0.1) → yellow
    expect(scores[1]).toHaveStyle({ color: '#f59e0b' });

    // Word 3: 0.65 < 0.7 → red
    expect(scores[2]).toHaveStyle({ color: '#dc2626' });
  });

  it('applies correct color coding based on custom threshold', () => {
    const segments: ScoreSegment[] = [
      { label: 'High', score: 0.9, metrics: null },
      { label: 'Mid', score: 0.82, metrics: null },
      { label: 'Low', score: 0.7, metrics: null }
    ];

    const { container } = render(<SegmentHighlights segments={segments} threshold={0.85} />);

    const scores = container.querySelectorAll('span[style*="color"]');

    // 0.90 >= 0.85 → green
    expect(scores[0]).toHaveStyle({ color: '#16a34a' });

    // 0.82 >= 0.75 (0.85 - 0.1) → yellow
    expect(scores[1]).toHaveStyle({ color: '#f59e0b' });

    // 0.70 < 0.75 → red
    expect(scores[2]).toHaveStyle({ color: '#dc2626' });
  });

  it('displays metrics when present', () => {
    render(<SegmentHighlights segments={mockSegments} />);

    // Word 1 and Word 3 have metrics
    const durationElements = screen.getAllByText(/duration/i);
    expect(durationElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/500ms/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/0.98/i)).toBeInTheDocument();
  });

  it('handles segments without metrics', () => {
    const segments: ScoreSegment[] = [{ label: 'NoMetrics', score: 0.85, metrics: null }];

    render(<SegmentHighlights segments={segments} />);

    expect(screen.getByText('NoMetrics')).toBeInTheDocument();
    expect(screen.getByText('85.0%')).toBeInTheDocument();

    // Metrics section should not be rendered
    const { container } = render(<SegmentHighlights segments={segments} />);
    const metricsDiv = container.querySelector('div[style*="fontSize"]');
    expect(metricsDiv).not.toBeInTheDocument();
  });

  it('renders metrics as key-value pairs', () => {
    const segments: ScoreSegment[] = [
      {
        label: 'Test',
        score: 0.9,
        metrics: {
          duration: '600ms',
          pitch: 'high',
          volume: 0.8
        }
      }
    ];

    render(<SegmentHighlights segments={segments} />);

    const durationElements = screen.getAllByText(/duration/i);
    expect(durationElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/600ms/i)).toBeInTheDocument();
    expect(screen.getByText(/pitch/i)).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/volume/i)).toBeInTheDocument();
    const volumeElements = screen.getAllByText(/0.8/i);
    expect(volumeElements.length).toBeGreaterThan(0);
  });

  it('uses default threshold of 0.8 when not specified', () => {
    const segments: ScoreSegment[] = [{ label: 'Test', score: 0.85, metrics: null }];

    const { container } = render(<SegmentHighlights segments={segments} />);
    const scoreElement = container.querySelector('span[style*="color"]');

    // 0.85 >= 0.8 → green
    expect(scoreElement).toHaveStyle({ color: '#16a34a' });
  });

  it('renders correct number of segment cards', () => {
    const { container } = render(<SegmentHighlights segments={mockSegments} />);

    const segmentCards = container.querySelectorAll('div[style*="border"]');
    expect(segmentCards).toHaveLength(3);
  });
});
