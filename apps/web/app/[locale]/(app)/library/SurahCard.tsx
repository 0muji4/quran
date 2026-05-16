'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import type { SurahSummary } from '../../../lib/types';
import { ChevronRightIcon } from '../../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../../styled-system/css';

type Props = {
  surah: SurahSummary;
  bestScore: number | null;
  isLastPracticed: boolean;
};

// SurahCard is a flat list-row, not a stacked card. The panel slot
// recipe doesn't fit (it assumes the title/subtitle/footer column
// pattern). Everything stays inline. The `active` state shrinks the
// padding by 1px on each side to keep the visual size constant when
// the border grows from 1px to 2px.
const cardClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  paddingBlock: '4',
  paddingInline: '5',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  textDecoration: 'none',
  color: '[inherit]',
  transition: '[box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease]',
  _hover: {
    boxShadow: 'cardHover',
    transform: '[translateY(-1px)]'
  }
});

const cardActiveClass = css({
  borderColor: 'border.strong',
  borderWidth: '2px',
  paddingBlock: '[calc(var(--spacing-4) - 1px)]',
  paddingInline: '[calc(var(--spacing-5) - 1px)]'
});

const numberClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[44px]',
  height: '[44px]',
  borderRadius: 'pill',
  backgroundColor: 'tan.soft',
  color: 'gold.onLight',
  fontWeight: 600,
  flexShrink: 0,
  fontFamily: 'serif',
  fontSize: '[18px]'
});

const infoClass = css({
  flex: '1',
  minWidth: '[0]',
  display: 'flex',
  flexDirection: 'column',
  gap: '[4px]'
});

const nameRowClass = css({
  display: 'flex',
  alignItems: 'baseline',
  gap: '2',
  flexWrap: 'wrap'
});

const nameEnClass = css({
  fontFamily: 'serif',
  fontSize: '[19px]',
  fontWeight: 500,
  color: 'ink.strong'
});

const nameMeaningClass = css({
  fontSize: '[13px]',
  color: 'ink.muted'
});

const metaRowClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: '[13px]',
  color: 'ink.muted'
});

const dotClass = css({
  display: 'inline-block',
  width: '[3px]',
  height: '[3px]',
  borderRadius: '[50%]',
  backgroundColor: 'ink.muted'
});

const bestScoreClass = css({
  color: 'teal',
  fontWeight: 600
});

const arabicClass = css({
  fontFamily: 'arabic',
  fontSize: '[26px]',
  color: 'ink.strong',
  direction: 'rtl',
  marginRight: '2',
  whiteSpace: 'nowrap'
});

const chevronClass = css({
  color: 'ink.muted',
  flexShrink: 0
});

export function SurahCard({ surah, bestScore, isLastPracticed }: Props) {
  const t = useTranslations('library.surahCard');
  const className = isLastPracticed ? cx(cardClass, cardActiveClass) : cardClass;
  // Collapse the visible spans into a single screen-reader announcement so
  // assistive tech reads the card as one link instead of stitching together
  // the surah number, name, dot separators, and badges.
  const ariaLabel =
    bestScore !== null
      ? t('ariaLabelWithScore', {
          name: surah.nameEn,
          place: surah.revelationPlace,
          count: surah.ayahCount,
          score: bestScore
        })
      : t('ariaLabel', {
          name: surah.nameEn,
          place: surah.revelationPlace,
          count: surah.ayahCount
        });
  return (
    <Link href={`/practice/${surah.id}/1`} className={className} aria-label={ariaLabel}>
      <span className={numberClass} aria-hidden="true">
        {surah.id}
      </span>
      <span className={infoClass} aria-hidden="true">
        <span className={nameRowClass}>
          <span className={nameEnClass}>{surah.nameEn}</span>
          <span className={dotClass} />
          <span className={nameMeaningClass}>
            {t('the', { meaning: surah.nameEn.split('-').pop() ?? surah.nameEn })}
          </span>
        </span>
        <span className={metaRowClass}>
          <span>{surah.revelationPlace}</span>
          <span className={dotClass} />
          <span>{t('ayahs', { count: surah.ayahCount })}</span>
          {bestScore !== null && (
            <>
              <span className={dotClass} />
              <span className={bestScoreClass}>{t('bestScore', { score: bestScore })}</span>
            </>
          )}
        </span>
      </span>
      <span className={arabicClass} lang="ar" aria-hidden="true">
        {surah.nameAr}
      </span>
      <ChevronRightIcon className={chevronClass} />
    </Link>
  );
}
