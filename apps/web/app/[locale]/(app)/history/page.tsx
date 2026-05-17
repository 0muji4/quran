import { getTranslations } from 'next-intl/server';
import { getCurrentSession } from '../../../lib/session';
import { HistoryList } from './HistoryList';
import { css } from '../../../../styled-system/css';

export const dynamic = 'force-dynamic';

const heroClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  marginBottom: '8',
  maxWidth: '[720px]'
});

const heroDescriptionClass = css({
  fontSize: '[16px]',
  color: 'ink.muted'
});

export default async function HistoryPage() {
  const [session, t] = await Promise.all([getCurrentSession(), getTranslations('history')]);
  return (
    <>
      <header className={heroClass}>
        <span className="eyebrow" aria-hidden="true">
          {t('eyebrow')}
        </span>
        <h1>{t('title')}</h1>
        <p className={heroDescriptionClass}>{t('description')}</p>
      </header>
      <HistoryList signedIn={session !== null} />
    </>
  );
}
