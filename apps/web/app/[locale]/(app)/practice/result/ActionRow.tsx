'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/navigation';
import { css, cx } from '../../../../../styled-system/css';
import { appButton } from '../../../../../styled-system/recipes';
import { fullRowClass } from './ResultFrame';

interface Props {
  surahId: string;
  surahName: string;
  ayahNumber: number;
  totalAyahs: number;
}

const rowClass = cx(
  fullRowClass,
  css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '2' })
);

// Full-width buttons stacked in a compact window; side by side from medium.
const actionClass = css({ flex: '[1 1 100%]', medium: { flex: '[0 0 auto]' } });

export function ActionRow({ surahId, surahName, ayahNumber, totalAyahs }: Props) {
  const t = useTranslations('result.action');
  const tryAgainHref = `/practice/${surahId}/${ayahNumber}`;
  const isLastAyah = ayahNumber >= totalAyahs;
  // On the final ayah, route home with a hint so the library page can show a
  // celebration toast. Encoding the surah name keeps the toast self-contained
  // without re-fetching the surah list to look up a display string.
  const continueHref = isLastAyah
    ? `/?completed=${encodeURIComponent(surahName)}`
    : `/practice/${surahId}/${ayahNumber + 1}`;
  const continueLabel = isLastAyah ? t('finish') : t('continue', { next: ayahNumber + 1 });

  // Persistence is automatic: `recordAttempt()` writes to localStorage and the
  // BFF the moment scoring completes (RecorderPanel). No manual save action —
  // the iOS client has none either, and a placeholder "Save" button confused
  // users into thinking the save was opt-in.
  return (
    <div className={rowClass}>
      <Link href={tryAgainHref} className={cx(appButton({ variant: 'outlined' }), actionClass)}>
        {t('tryAgain')}
      </Link>
      <Link href={continueHref} className={cx(appButton({ variant: 'filled' }), actionClass)}>
        {continueLabel}
      </Link>
    </div>
  );
}
