'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import type { SurahSummary } from '../../../lib/types';
import type { BffSuggestionResponse } from '../../../lib/classify';
import { getLastPracticed } from '../../../lib/storage';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { difficultyOf, pickSuggestion } from '../../../lib/classify';
import { ArrowRightIcon, PlusIcon } from '../../../components/icons/ArrowRightIcon';
import { trackUiEvent } from '../../../telemetry/use-ui-event';
import { css, cx } from '../../../../styled-system/css';
import { appButton, appCard } from '../../../../styled-system/recipes';
import {
  actionsClass,
  arrowButtonClass,
  bodyClass,
  cardLayoutClass,
  eyebrowClass,
  titleClass,
  titleRowClass
} from './libraryCard';
import { SurahNameArabic } from './SurahNameArabic';

interface Props {
  surahs: SurahSummary[];
  // BFF-served personalisation (ADR 0015). `null` for guests; the
  // component falls back to the local heuristic in that case.
  suggestion?: BffSuggestionResponse | null;
}

const cardClass = cx(appCard({ variant: 'filled' }), cardLayoutClass);

const metaClass = css({
  flexGrow: 1,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

export function SuggestedCard({ surahs, suggestion = null }: Props) {
  const [last] = useLocalStorageState(getLastPracticed, null);
  const t = useTranslations('library.suggested');
  const picked = useMemo(
    () => pickSuggestion(surahs, last, suggestion?.suggested.surahId),
    [surahs, last, suggestion?.suggested.surahId]
  );

  if (!picked) {
    return null;
  }

  const difficulty = difficultyOf(picked, suggestion?.difficulties);
  const blurbKey =
    picked.ayahCount <= 5 ? 'blurbShort' : picked.ayahCount <= 15 ? 'blurbMedium' : 'blurbLong';

  return (
    <div className={cardClass}>
      <span className={eyebrowClass}>
        <PlusIcon size={16} /> {t('badge')}
      </span>
      <div className={titleRowClass}>
        <h2 className={titleClass}>{picked.nameEn}</h2>
        <SurahNameArabic name={picked.nameAr} />
      </div>
      <p className={bodyClass}>{t(blurbKey, { count: picked.ayahCount })}</p>
      <div className={actionsClass}>
        <span className={metaClass}>
          <span>{picked.revelationPlace}</span>
          <span aria-hidden="true">·</span>
          <span>{difficulty}</span>
        </span>
        <Link
          className={cx(appButton({ variant: 'tonal' }), arrowButtonClass)}
          href={`/practice/${picked.id}/1`}
          onClick={() =>
            trackUiEvent('web.ui.suggested_clicked', {
              surahId: picked.id,
              ayahCount: picked.ayahCount,
              // ADR 0015 `reason` field — `placeholder` covers the
              // guest / BFF-fallback path where suggestion is null.
              reason: suggestion?.suggested.reason ?? 'placeholder'
            })
          }
        >
          {t('begin')} <ArrowRightIcon size={18} />
        </Link>
      </div>
    </div>
  );
}
