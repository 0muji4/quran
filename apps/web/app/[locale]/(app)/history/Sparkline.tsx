interface Props {
  /** Score points oldest → newest, on a 0–100 scale. */
  values: number[];
}

const WIDTH = 64;
const HEIGHT = 24;
const PAD = 3;

// Tiny trend line for a history row. Stroke is `currentColor`, so the
// caller tints it (per score tier) via the surrounding element's color.
// Fewer than two points has no trend to draw, so it renders nothing.
export function Sparkline({ values }: Props) {
  if (values.length < 2) return null;

  const points = values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (WIDTH - 2 * PAD);
      const clamped = Math.min(100, Math.max(0, v));
      const y = HEIGHT - PAD - (clamped / 100) * (HEIGHT - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
