import { appProgress } from '../../../../styled-system/recipes';

interface Props {
  total: number;
  current: number;
  // The visible position text ("Ayah 1 of 7"), reused as the accessible name.
  label: string;
}

// The ayah position as a linear progress, whatever the surah's length, as in
// the apps.
export function AyahProgressBar({ total, current, label }: Props) {
  if (total <= 0) return null;
  return (
    <progress
      className={appProgress()}
      value={clampAyah(current, total)}
      max={total}
      aria-label={label}
    />
  );
}

/** The current ayah, kept between 1 and the surah's last ayah. */
export function clampAyah(current: number, total: number): number {
  return Math.max(1, Math.min(current, total));
}
