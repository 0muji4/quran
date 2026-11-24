'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import type { SurahSummary } from '../../../lib/types';
import { getLastPracticed } from '../../../lib/storage';
import { formatPracticedAt } from '../../../lib/classify';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { ArrowRightIcon, BookmarkIcon, StarIcon } from '../../../components/icons/ArrowRightIcon';
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
}

const cardClass = cx(appCard({ variant: 'elevated' }), cardLayoutClass);

const primaryActionClass = cx(appButton({ variant: 'filled' }), arrowButtonClass);

// A Material 3 linear progress: the indicator and the track with a gap
// between them, and the stop at the track's end.
const barClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  height: '[4px]',
  marginBlock: '1'
});

const indicatorClass = css({
  flexShrink: 0,
  height: '[4px]',
  borderRadius: 'full',
  background: 'primary'
});

const trackClass = css({
  flexGrow: 1,
  display: 'flex',
  justifyContent: 'flex-end',
  height: '[4px]',
  borderRadius: 'full',
  background: 'secondaryContainer',
  _after: {
    content: '""',
    width: '[4px]',
    height: '[4px]',
    borderRadius: 'full',
    background: 'primary'
  }
});

export function ContinueCard({ surahs }: Props) {
  const [last] = useLocalStorageState(getLastPracticed, null);
  const t = useTranslations('library.continue');

  if (!last) {
    return (
      <div className={cardClass}>
        <span className={eyebrowClass}>
          <StarIcon /> {t('badgeGetStarted')}
        </span>
        <h2 className={titleClass}>{t('emptyTitle')}</h2>
        <p className={bodyClass}>{t('emptyDescription')}</p>
        <div className={actionsClass}>
          <Link className={primaryActionClass} href={`/practice/${surahs[0]?.id ?? '1'}/1`}>
            {t('emptyCta')} <ArrowRightIcon size={18} />
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
    <div className={cardClass}>
      <span className={eyebrowClass}>
        <BookmarkIcon size={16} /> {t('badge')}
      </span>
      <div className={titleRowClass}>
        <h2 className={titleClass}>{surahNameEn}</h2>
        <SurahNameArabic name={surahNameAr} />
      </div>
      <p className={bodyClass}>
        {t('progress', {
          ayah: last.ayahNumber,
          total: ayahCount,
          date: formatPracticedAt(last.practicedAt)
        })}
      </p>
      <div className={barClass} aria-hidden="true">
        {progress > 0 ? (
          <span className={indicatorClass} style={{ width: `${progress}%` }} />
        ) : null}
        {progress < 100 ? <span className={trackClass} /> : null}
      </div>
      <div className={actionsClass}>
        <Link className={appButton({ variant: 'text' })} href={`/practice/${last.surahId}/1`}>
          {t('startOver')}
        </Link>
        <Link className={primaryActionClass} href={`/practice/${last.surahId}/${last.ayahNumber}`}>
          {t('resume', { ayah: last.ayahNumber })} <ArrowRightIcon size={18} />
        </Link>
      </div>
    </div>
  );
}
