type Props = {
  className?: string;
};

// Decorative line-art mihrab (prayer-niche arch) with an 8-pointed star at
// the apex and a hanging lamp — the centrepiece of the auth brand panel.
// Strokes use the gold-on-dark token so it reads on the dark panel; the
// star reuses the 8-point geometry from components/icons/StarOrnament.tsx.
// Purely decorative: aria-hidden, the ayah text below carries the meaning.
export function MihrabIllustration({ className }: Props) {
  return (
    <svg
      width="200"
      height="280"
      viewBox="0 0 200 280"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g
        stroke="var(--color-gold-on-dark)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Outer arch */}
        <path d="M34 274V132C34 95 64 66 100 66s66 29 66 66v142" />
        {/* Inner arch */}
        <path d="M58 274V140c0-23 19-42 42-42s42 19 42 42v134" />
        {/* Hanging lamp: cord from the apex down to a small pendant */}
        <path d="M100 98v60" />
        <circle cx="100" cy="170" r="9" fill="var(--color-gold-surface)" stroke="none" />
        <path d="M91 170h18" />
      </g>
      {/* 8-pointed star at the apex */}
      <g transform="translate(100 40)">
        <g fill="var(--color-gold-on-dark)" stroke="var(--color-gold-surface)" strokeWidth="0.6">
          <polygon points="0,-26 5.5,-5.5 26,0 5.5,5.5 0,26 -5.5,5.5 -26,0 -5.5,-5.5" />
          <polygon transform="rotate(45)" points="0,-19 4,-4 19,0 4,4 0,19 -4,4 -19,0 -4,-4" />
        </g>
      </g>
    </svg>
  );
}
