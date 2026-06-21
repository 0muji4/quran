import { EditProfileButton } from './EditProfileButton';
import { StreakBadge } from './StreakBadge';
import type { UserLevel } from '../../../actions';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

interface Props {
  displayName: string | null;
  email: string;
  level: UserLevel | null;
  createdAt: string | null;
}

const cardClass = css({
  padding: '6',
  display: 'flex',
  alignItems: 'center',
  gap: '6',
  flexWrap: 'wrap'
});

const avatarClass = css({
  width: '[88px]',
  height: '[88px]',
  borderRadius: '[50%]',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'bg.paper',
  fontFamily: 'serif',
  fontSize: '[32px]',
  // Olive / gold radial gradient mirroring the design mock.
  background:
    '[radial-gradient(circle at 35% 30%, var(--colors-gold-surface), var(--colors-bg-nav))]',
  flexShrink: 0
});

const identityClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  flex: '1',
  minWidth: '[240px]'
});

const nameClass = css({
  fontFamily: 'serif',
  fontSize: '[26px]',
  color: 'ink.strong'
});

const badgeRowClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2',
  marginTop: '1'
});

const badgeBaseClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  paddingBlock: '1',
  paddingInline: '3',
  borderRadius: 'pill'
});

const badgeLevelClass = css({ backgroundColor: 'mint.bg', color: 'green.deep' });
const badgeJoinedClass = css({ backgroundColor: 'tan.soft', color: 'ink.muted' });

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
  // "Joined March 2026". Month + year matches the design mock and
  // avoids exposing the exact day (which has no UX value here).
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  return `Joined ${formatter.format(date)}`;
};

export function ProfileHeader({ displayName, email, level, createdAt }: Props) {
  const initial = initialFor(displayName, email);
  const levelText = levelLabel(level);
  const joinedText = joinedLabel(createdAt);

  return (
    <section className={cx(panel({ surface: 'paper' }).root, cardClass)} aria-label="Your account">
      <div className={avatarClass} aria-hidden="true">
        {initial}
      </div>
      <div className={identityClass}>
        <span className={nameClass}>{displayName ?? email}</span>
        <div className={badgeRowClass}>
          {levelText && <span className={cx(badgeBaseClass, badgeLevelClass)}>{levelText}</span>}
          {joinedText && <span className={cx(badgeBaseClass, badgeJoinedClass)}>{joinedText}</span>}
          <StreakBadge />
        </div>
      </div>
      <EditProfileButton displayName={displayName} email={email} level={level} />
    </section>
  );
}
