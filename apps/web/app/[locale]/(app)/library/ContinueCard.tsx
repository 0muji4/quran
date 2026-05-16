'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import type { SurahSummary } from '../../../lib/types';
import { getLastPracticed } from '../../../lib/storage';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { ArrowRightIcon, BookmarkIcon } from '../../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../../styled-system/css';
import { button, panel } from '../../../../styled-system/recipes';

type Props = {
  surahs: SurahSummary[];
};

const COMPASS_SVG = (
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.8">
    <circle cx="100" cy="100" r="95" />
    <circle cx="100" cy="100" r="70" />
    <circle cx="100" cy="100" r="45" />
    <line x1="100" y1="0" x2="100" y2="200" />
    <line x1="0" y1="100" x2="200" y2="100" />
    <line x1="29.3" y1="29.3" x2="170.7" y2="170.7" />
    <line x1="170.7" y1="29.3" x2="29.3" y2="170.7" />
  </svg>
);

// The panel(surface:'continue') recipe gives us bg.continue + ink.onDark
// + the gold-tinted badge for free. ContinueCard adds two pieces the
// generic recipe doesn't model: a 320px min-height to keep the hero
// grid balanced, and a justify-content:space-between so actions stick
// to the bottom regardless of content height.
const continueRootExtras = css({
  justifyContent: 'space-between',
  minHeight: '[320px]'
});

const ornamentClass = css({
  position: 'absolute',
  top: '5',
  right: '5',
  width: '[clamp(120px, 40vw, 200px)]',
  height: '[clamp(120px, 40vw, 200px)]',
  opacity: 0.15,
  pointerEvents: 'none',
  color: 'gold.onDark'
});

// The recipe's body slot has gap:'3'. ContinueCard adds margin-top:'6'
// so it sits below the badge with the same rhythm as the other slots.
const bodyExtras = css({ marginTop: '6' });

// .continueMeta is smaller than the recipe's subtitle default (15px,
// for SuggestedCard's description). Continue's meta is 13px caption
// copy ("Ayah X of Y · last practiced …"). Override per-consumer.
const metaOverride = css({ fontSize: '[13px]' });

const arabicClass = css({
  fontFamily: 'arabic',
  fontSize: '[56px]',
  lineHeight: '[1]',
  color: 'tan',
  direction: 'rtl'
});

const rowClass = css({
  display: 'flex',
  alignItems: 'baseline',
  gap: '3',
  flexWrap: 'wrap'
});

const progressTrackClass = css({
  marginTop: '3',
  backgroundColor: '[rgba(232, 217, 184, 0.12)]',
  borderRadius: 'pill',
  height: '[6px]',
  overflow: 'hidden'
});

const progressFillClass = css({
  height: '[100%]',
  backgroundColor: 'gold.surface',
  borderRadius: 'pill',
  transition: '[width 0.3s ease]'
});

// .continueActions: like the recipe's footer (flex + gap) but
// justify-content defaults to flex-start (not space-between) and
// allows wrapping. Override with a thin css().
const actionsClass = css({
  marginTop: '6',
  display: 'flex',
  gap: '3',
  flexWrap: 'wrap',
  justifyContent: 'flex-start'
});

// .btnGhostDark — dark ghost button used alongside the gold CTA. Not
// covered by the four button() tone variants; inline until a second
// consumer of this shape appears.
const btnGhostDarkClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '[44px]',
  backgroundColor: '[transparent]',
  color: 'ink.onDark',
  paddingBlock: '[10px]',
  paddingInline: '[18px]',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '[rgba(232, 217, 184, 0.3)]',
  fontWeight: 500,
  fontSize: '[14px]',
  textDecoration: 'none',
  transition: '[border-color 0.15s ease, background 0.15s ease]',
  _hover: {
    borderColor: '[rgba(232, 217, 184, 0.6)]',
    backgroundColor: '[rgba(232, 217, 184, 0.04)]'
  }
});

export function ContinueCard({ surahs }: Props) {
  const [last] = useLocalStorageState(getLastPracticed, null);
  const t = useTranslations('library.continue');
  const p = panel({ surface: 'continue' });

  if (!last) {
    return (
      <div className={cx(p.root, continueRootExtras)}>
        <div className={ornamentClass}>{COMPASS_SVG}</div>
        <span className={p.badge}>
          <BookmarkIcon /> {t('badgeGetStarted')}
        </span>
        <div className={cx(p.body, bodyExtras)}>
          <h2 className={p.title}>{t('emptyTitle')}</h2>
          <p className={cx(p.subtitle, metaOverride)}>{t('emptyDescription')}</p>
        </div>
        <div className={actionsClass}>
          <Link className={button({ tone: 'gold' })} href={`/practice/${surahs[0]?.id ?? '1'}/1`}>
            <ArrowRightIcon /> {t('emptyCta')}
          </Link>
        </div>
      </div>
    );
  }

  const surah = surahs.find((s) => s.id === last.surahId);
  const surahNameAr = surah?.nameAr ?? last.surahNameAr;
  const surahNameEn = surah?.nameEn ?? last.surahNameEn;
  const ayahCount = surah?.ayahCount ?? last.ayahCount;
  const progress =
    ayahCount > 0 ? Math.min(100, Math.round((last.ayahNumber / ayahCount) * 100)) : 0;

  return (
    <div className={cx(p.root, continueRootExtras)}>
      <div className={ornamentClass}>{COMPASS_SVG}</div>
      <span className={p.badge}>
        <BookmarkIcon /> {t('badge')}
      </span>
      <div className={cx(p.body, bodyExtras)}>
        <div className={rowClass}>
          <span className={arabicClass} lang="ar">
            {surahNameAr}
          </span>
          <span className={p.title}>{surahNameEn}</span>
        </div>
        <p className={cx(p.subtitle, metaOverride)}>
          {t('progress', {
            ayah: last.ayahNumber,
            total: ayahCount,
            date: new Date(last.practicedAt).toLocaleDateString()
          })}
        </p>
        <div className={progressTrackClass} aria-hidden="true">
          <div className={progressFillClass} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className={actionsClass}>
        <Link
          className={button({ tone: 'gold' })}
          href={`/practice/${last.surahId}/${last.ayahNumber}`}
        >
          <ArrowRightIcon /> {t('resume', { ayah: last.ayahNumber })}
        </Link>
        <Link className={btnGhostDarkClass} href={`/practice/${last.surahId}/1`}>
          {t('startOver')}
        </Link>
      </div>
    </div>
  );
}
