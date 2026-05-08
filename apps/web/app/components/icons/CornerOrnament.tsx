type Position = 'tl' | 'tr' | 'bl' | 'br';

type Props = {
  position: Position;
  size?: number;
  className?: string;
};

const ROTATION: Record<Position, number> = {
  tl: 0,
  tr: 90,
  br: 180,
  bl: 270
};

export function CornerOrnament({ position, size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      style={{ transform: `rotate(${ROTATION[position]}deg)` }}
    >
      <g
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h10" />
        <path d="M4 4v10" />
        <path d="M4 14l4-4" />
        <path d="M14 4l-4 4" />
      </g>
    </svg>
  );
}
