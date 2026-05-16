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
  const session = await getCurrentSession();
  return (
    <>
      <header className={heroClass}>
        <span className="eyebrow" aria-hidden="true">
          + Your tilawah journey
        </span>
        <h1>Recent attempts</h1>
        <p className={heroDescriptionClass}>
          A log of your recent recitations and scores. Synced across your devices when you are
          signed in.
        </p>
      </header>
      <HistoryList signedIn={session !== null} />
    </>
  );
}
