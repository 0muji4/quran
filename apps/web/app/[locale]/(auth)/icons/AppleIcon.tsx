type Props = {
  size?: number;
  className?: string;
};

// Apple logomark. Uses currentColor so it inherits the button's text
// colour. Decorative — the button label carries the accessible name.
export function AppleIcon({ size = 18, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.94 13.79c-.27.62-.4.9-.74 1.45-.48.77-1.16 1.73-2 1.73-.75.01-.94-.49-1.96-.48-1.02 0-1.23.49-1.98.48-.84-.01-1.48-.87-1.96-1.64-1.34-2.16-1.48-4.69-.65-6.04.58-.95 1.5-1.51 2.37-1.51.88 0 1.44.49 2.17.49.71 0 1.14-.49 2.16-.49.77 0 1.59.42 2.17 1.15-1.91 1.05-1.6 3.78.19 4.86ZM11.43 4.4c.37-.48.65-1.15.55-1.84-.6.04-1.31.43-1.72.92-.37.45-.69 1.13-.57 1.79.66.02 1.34-.37 1.74-.87Z" />
    </svg>
  );
}
