import type { ScoreSegment } from '@quran-project/shared-ts';

interface SegmentHighlightsProps {
  segments: ScoreSegment[];
  threshold?: number;
}

// Maps to score.pass/warn/fail semantic tokens (packages/ui/src/theme/
// tokens.ts). References the Panda-emitted CSS variables directly so
// this component stays a plain TS module — no styled-system import,
// works in any consumer that loads Panda's @layer tokens.
const scoreColor = (score: number, threshold: number): string => {
  if (score >= threshold) return 'var(--colors-score-pass)';
  if (score >= threshold - 0.1) return 'var(--colors-score-warn)';
  return 'var(--colors-score-fail)';
};

export const SegmentHighlights = ({ segments, threshold = 0.8 }: SegmentHighlightsProps) => {
  if (!segments.length) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          style={{
            border: '1px solid var(--colors-border)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderRadius: 'var(--radii-md)',
            background: 'var(--colors-bg-paper-soft)',
            display: 'grid',
            gap: 'var(--spacing-2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{segment.label}</strong>
            <span
              style={{
                color: scoreColor(segment.score, threshold),
                fontWeight: 700
              }}
            >
              {(segment.score * 100).toFixed(1)}%
            </span>
          </div>
          {segment.metrics && (
            <div style={{ fontSize: 14, color: 'var(--colors-ink-muted)' }}>
              {Object.entries(segment.metrics).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
