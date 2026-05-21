interface Props {
  size?: number;
  number?: number;
  className?: string;
}

// 8-pointed star ayah marker, with the ayah number embedded.
export function StarOrnament({ size = 56, number, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform="translate(50 50)">
        <g fill="var(--colors-gold-on-dark)" stroke="var(--colors-gold-surface)" strokeWidth="0.6">
          <polygon points="0,-44 9,-9 44,0 9,9 0,44 -9,9 -44,0 -9,-9" />
          <polygon transform="rotate(45)" points="0,-32 7,-7 32,0 7,7 0,32 -7,7 -32,0 -7,-7" />
        </g>
        {typeof number === 'number' && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontFamily="var(--fonts-serif)"
            fill="var(--colors-gold-on-light)"
            fontWeight="600"
          >
            {number}
          </text>
        )}
      </g>
    </svg>
  );
}
