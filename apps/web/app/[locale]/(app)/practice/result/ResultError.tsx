'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/navigation';
import type { AyahRecord, SurahSummary } from '../../../../lib/types';
import { css, cx } from '../../../../../styled-system/css';
import { appButton } from '../../../../../styled-system/recipes';
import { ResultFrame, fullRowClass } from './ResultFrame';

interface Props {
  surah: SurahSummary;
  ayah: AyahRecord;
  message: string;
}

const cardClass = cx(
  fullRowClass,
  css({
    display: 'flex',
    flexDirection: 'column',
    gap: '3',
    padding: '4',
    borderRadius: 'medium',
    background: 'errorContainer',
    color: 'onErrorContainer'
  })
);

const bodyClass = css({ display: 'flex', alignItems: 'flex-start', gap: '3' });

const iconClass = css({ flexShrink: 0, marginTop: '[2px]' });

const textClass = css({ display: 'flex', flexDirection: 'column', gap: '1' });

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

const messageClass = css({ margin: '0', textStyle: 'bodyMedium' });

const actionsClass = css({ display: 'flex', justifyContent: 'flex-end' });

export function ResultError({ surah, ayah, message }: Props) {
  const t = useTranslations('result.error');
  const tryAgainHref = `/practice/${surah.id}/${ayah.ayahNumber}`;
  return (
    <ResultFrame surahId={surah.id} surahName={surah.nameEn} ayahNumber={ayah.ayahNumber}>
      <section className={cardClass} role="alert">
        <div className={bodyClass}>
          <svg
            className={iconClass}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
          <div className={textClass}>
            <h1 className={titleClass}>{t('title')}</h1>
            <p className={messageClass}>{message}</p>
          </div>
        </div>
        <div className={actionsClass}>
          <Link href={tryAgainHref} className={appButton({ variant: 'filled' })}>
            {t('tryAgain')}
          </Link>
        </div>
      </section>
    </ResultFrame>
  );
}
