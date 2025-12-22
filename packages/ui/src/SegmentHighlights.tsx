import type { ScoreSegment } from '@quran-project/shared-ts';

type SegmentHighlightsProps = {
  segments: ScoreSegment[];
  threshold?: number;
};

const scoreColor = (score: number, threshold: number): string => {
  if (score >= threshold) return '#16a34a';
  if (score >= threshold - 0.1) return '#f59e0b';
  return '#dc2626';
};

export const SegmentHighlights = ({ segments, threshold = 0.8 }: SegmentHighlightsProps) => {
  if (!segments.length) return null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          style={{
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            borderRadius: 12,
            background: '#f8fafc',
            display: 'grid',
            gap: 6
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
            <div style={{ fontSize: 14, color: '#475569' }}>
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
