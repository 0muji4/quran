'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import type { SurahSummary } from '../../../lib/types';
import { BookmarkIcon } from '../../../components/icons/ArrowRightIcon';
import { css } from '../../../../styled-system/css';
import { appListItem } from '../../../../styled-system/recipes';
import { SurahNameArabic } from './SurahNameArabic';

interface Props {
  surah: SurahSummary;
  bestScore: number | null;
  isLastPracticed: boolean;
}

const numberClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '[40px]',
  height: '[40px]',
  borderRadius: 'full',
  background: 'secondaryContainer',
  color: 'onSecondaryContainer',
  textStyle: 'labelLarge'
});

const textClass = css({ flex: '1', minWidth: '[0]', display: 'flex', flexDirection: 'column' });

const nameClass = css({ display: 'flex', alignItems: 'center', gap: '1', textStyle: 'bodyLarge' });

const bookmarkClass = css({ flexShrink: 0, color: 'primary' });

// Wraps between segments, never inside one.
const metaClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: '1',
  whiteSpace: 'nowrap',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant'
});

function Separator() {
  return (
    <>
      <span className="sr-only">, </span>
      <span aria-hidden="true">·</span>
    </>
  );
}

/**
 * One surah as a Material 3 list item. The surah the user left off at carries
 * a bookmark.
 */
export function SurahRow({ surah, bestScore, isLastPracticed }: Props) {
  const t = useTranslations('library.surahRow');
  return (
    <Link href={`/practice/${surah.id}/1`} className={appListItem()}>
      <span className={numberClass} aria-hidden="true">
        {surah.id}
      </span>
      <span className={textClass}>
        <span className={nameClass}>
          {surah.nameEn}
          {isLastPracticed && (
            <>
              <BookmarkIcon className={bookmarkClass} />
              <span className="sr-only">, {t('lastPracticed')}</span>
            </>
          )}
        </span>
        <span className="sr-only">, </span>
        <span className={metaClass}>
          <span>{surah.revelationPlace}</span>
          <Separator />
          <span>{t('ayahs', { count: surah.ayahCount })}</span>
          {bestScore !== null && (
            <>
              <Separator />
              <span>{t('bestScore', { score: bestScore })}</span>
            </>
          )}
        </span>
      </span>
      <SurahNameArabic name={surah.nameAr} />
    </Link>
  );
}
