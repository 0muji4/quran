import { EditProfileButton } from './EditProfileButton';
import { StreakBadge } from './StreakBadge';
import { badgeClass } from './badgeStyles';
import type { UserLevel } from '../../../actions';
import { css, cx } from '../../../../styled-system/css';
import { appCard } from '../../../../styled-system/recipes';

interface Props {
  displayName: string | null;
  email: string;
  level: UserLevel | null;
  createdAt: string | null;
}

const cardClass = cx(
  appCard({ variant: 'elevated' }),
  css({ alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '4', padding: '4' })
);

const identityClass = css({ display: 'flex', alignItems: 'center', gap: '4', minWidth: '[0]' });

const avatarClass = css({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '[64px]',
  height: '[64px]',
  borderRadius: 'full',
  background: 'primaryContainer',
  color: 'onPrimaryContainer',
  textStyle: 'headlineSmall'
});

const nameClass = css({
  margin: '0',
  color: '[inherit]',
  textStyle: 'titleLarge',
  overflowWrap: 'anywhere'
});

const emailClass = css({
  margin: '0',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant',
  overflowWrap: 'anywhere'
});

const badgeRowClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2',
  _empty: { display: 'none' }
});

const actionsClass = css({ display: 'flex', justifyContent: 'flex-end' });

const initialFor = (displayName: string | null, email: string): string => {
  const source = (displayName ?? email).trim();
  return source.length > 0 ? source.charAt(0).toUpperCase() : '·';
};

const levelLabel = (level: string | null): string | null => {
  if (level === 'beginner') return 'Beginner';
  if (level === 'intermediate') return 'Intermediate';
  if (level === 'advanced') return 'Advanced';
  return null;
};

const joinedLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // "Joined March 2026". Month and year avoid exposing the exact day, which
  // has no use here.
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  return `Joined ${formatter.format(date)}`;
};

export function ProfileHeader({ displayName, email, level, createdAt }: Props) {
  const initial = initialFor(displayName, email);
  const levelText = levelLabel(level);
  const joinedText = joinedLabel(createdAt);

  return (
    <section className={cardClass} aria-label="Your account">
      <div className={identityClass}>
        <div className={avatarClass} aria-hidden="true">
          {initial}
        </div>
        <div>
          <h2 className={nameClass}>{displayName ?? email}</h2>
          {displayName && <p className={emailClass}>{email}</p>}
        </div>
      </div>
      <div className={badgeRowClass}>
        {levelText && <span className={badgeClass}>{levelText}</span>}
        {joinedText && <span className={badgeClass}>{joinedText}</span>}
        <StreakBadge />
      </div>
      <div className={actionsClass}>
        <EditProfileButton displayName={displayName} email={email} level={level} />
      </div>
    </section>
  );
}
