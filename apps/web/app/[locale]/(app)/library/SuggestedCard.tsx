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
import { panel } from '../../../../styled-system/recipes';

interface Props {
  surahs: SurahSummary[];
  // BFF-served personalisation (ADR 0015). `null` for guests; the
  // component falls back to the local heuristic in that case.
  suggestion?: BffSuggestionResponse | null;
}

// panel(surface:'paper') already covers the white bg + card shadow +
// mint badge + ink.strong title + ink.muted 15px subtitle. SuggestedCard
// needs three tweaks: a 320px min-height to align with ContinueCard in
// the hero grid, justify-content:space-between so the footer sticks to
// the bottom, and gap:0 because the legacy CSS used per-slot margin-top
// (5 / 3 / 6) instead of a uniform parent gap.
const rootExtras = css({
  minHeight: '[320px]',
  justifyContent: 'space-between',
  gap: '[0]'
});

const titleExtras = css({ marginTop: '5' });
const descExtras = css({ marginTop: '3' });

const footerClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '6'
});

const metaClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3',
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

const linkTealClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '[4px]',
  color: 'teal',
  fontWeight: 600,
  fontSize: '[14px]',
  _hover: { color: 'teal.deep' }
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
  const p = panel({ surface: 'paper' });
  const blurbKey =
    picked.ayahCount <= 5 ? 'blurbShort' : picked.ayahCount <= 15 ? 'blurbMedium' : 'blurbLong';

  return (
    <div className={cx(p.root, rootExtras)}>
      <span className={p.badge}>
        <PlusIcon /> {t('badge')}
      </span>
      <h2 className={cx(p.title, titleExtras)}>{picked.nameEn}</h2>
      <p className={cx(p.subtitle, descExtras)}>{t(blurbKey, { count: picked.ayahCount })}</p>
      <div className={footerClass}>
        <span className={metaClass}>
          <span>{t('meta', { count: picked.ayahCount })}</span>
          <span className={dotClass} aria-hidden="true" />
          <span>{picked.revelationPlace}</span>
          <span className={dotClass} aria-hidden="true" />
          <span>{difficulty}</span>
        </span>
        <Link
          className={linkTealClass}
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
          {t('begin')} <ArrowRightIcon size={14} />
        </Link>
      </div>
    </div>
  );
}
