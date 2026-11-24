import { getTranslations } from 'next-intl/server';
import { getCurrentSession } from '../../../lib/session';
import { PageFrame } from '../../../components/PageFrame';
import { HistoryList } from './HistoryList';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const [session, t] = await Promise.all([getCurrentSession(), getTranslations('history')]);
  return (
    <PageFrame title={t('title')}>
      <HistoryList signedIn={session !== null} />
    </PageFrame>
  );
}
