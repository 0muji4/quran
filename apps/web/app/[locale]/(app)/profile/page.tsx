import { redirect } from 'next/navigation';
import { getCurrentSession } from '../../../lib/session';
import { fetchCurrentUserProfile } from '../../../actions';
import { ProfileHeader } from './ProfileHeader';
import { AccountDataCard } from './AccountDataCard';
import { SignOutSection } from './SignOutSection';
import { css } from '../../../../styled-system/css';

const pageClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6',
  maxWidth: '[920px]',
  marginInline: 'auto'
});

const eyebrowClass = css({
  fontSize: '[12px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.08em]',
  color: 'gold.onLight'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[44px]',
  lineHeight: '[1.1]',
  color: 'ink.strong',
  marginBlockStart: '1',
  marginBlockEnd: '4'
});

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

  const profile = await fetchCurrentUserProfile();
  // If `/auth/me` failed (network blip, BFF down), fall back to the
  // JWT-derived session so the page still renders a usable identity
  // — just without the badges that need DB-only fields.
  const view = profile ?? { ...session, createdAt: null, level: null };

  return (
    <div className={pageClass}>
      <header>
        <p className={eyebrowClass}>
          <span aria-hidden="true">+ </span>Your account
        </p>
        <h1 className={titleClass}>Profile</h1>
      </header>

      <ProfileHeader
        displayName={view.displayName}
        email={view.email}
        level={view.level ?? null}
        createdAt={view.createdAt ?? null}
      />

      <AccountDataCard email={view.email} />

      <SignOutSection />
    </div>
  );
}
