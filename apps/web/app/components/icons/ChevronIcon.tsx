import { css } from '../../../styled-system/css';

interface Props {
  // `back` points to the start of the line, `forward` to its end, so the
  // chevron flips with the text direction.
  direction: 'back' | 'forward';
  size?: number;
}

const flipInRtl = css({ _rtl: { transform: 'scaleX(-1)' } });

export function ChevronIcon({ direction, size = 24 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={flipInRtl}
      aria-hidden="true"
    >
      <path d={direction === 'back' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}
