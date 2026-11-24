import { redirect } from 'next/navigation';
import { getCurrentSession } from '../../../lib/session';
import { fetchCurrentUserProfile, getPreferencesAction } from '../../../actions';
import { PageFrame } from '../../../components/PageFrame';
import { ProfileHeader } from './ProfileHeader';
import { PracticePreferencesCard } from './PracticePreferencesCard';
import { AccountDataCard } from './AccountDataCard';
import { SignOutSection } from './SignOutSection';
import { css } from '../../../../styled-system/css';

// Beside the profile in expanded windows, and below it otherwise.
const layoutClass = css({
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  gap: '4',
  expanded: { gridTemplateColumns: '[336px minmax(0, 1fr)]', columnGap: '8' }
});

const settingsClass = css({ display: 'flex', flexDirection: 'column', gap: '4', minWidth: '[0]' });

// `/profile`. Signed-out users get bounced to sign-in. The page itself
// is a Server Component so the BFF call happens on the server and the
// initial HTML already carries the user's name + level + joined date.
// Streak (which is computed client-side from localStorage) lives in
// its own client island inside the header.
export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/sign-in');
  }

  // Parallel so the preferences read doesn't serialise behind the profile one.
  const [profile, preferences] = await Promise.all([
    fetchCurrentUserProfile(),
    getPreferencesAction()
  ]);
  // If `/auth/me` failed (network blip, BFF down), fall back to the
  // JWT-derived session so the page still renders a usable identity
  // — just without the badges that need DB-only fields.
  const view = profile ?? { ...session, createdAt: null, level: null, passwordChangedAt: null };

  return (
    <PageFrame title="Profile">
      <div className={layoutClass}>
        <ProfileHeader
          displayName={view.displayName}
          email={view.email}
          level={view.level ?? null}
          createdAt={view.createdAt ?? null}
        />
        <div className={settingsClass}>
          <PracticePreferencesCard preferences={preferences} />
          <AccountDataCard email={view.email} passwordChangedAt={view.passwordChangedAt ?? null} />
          <SignOutSection />
        </div>
      </div>
    </PageFrame>
  );
}
