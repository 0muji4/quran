import { ChangeEmailButton } from './ChangeEmailButton';
import { UpdatePasswordButton } from './UpdatePasswordButton';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

interface Props {
  email: string;
  passwordChangedAt: string | null;
}

const cardClass = css({
  padding: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '5'
});

const cardTitleClass = css({
  fontFamily: 'serif',
  fontSize: '[20px]',
  color: 'ink.strong'
});

const rowClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '4',
  paddingBlockStart: '4',
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: 'border'
});

const firstRowClass = css({ borderTopWidth: '[0]', paddingBlockStart: '[0]' });

const labelStackClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1'
});

const eyebrowClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  color: 'ink.muted'
});

const primaryClass = css({
  fontSize: '[15px]',
  color: 'ink.strong'
});

const helperClass = css({
  fontSize: '[13px]',
  color: 'ink.muted'
});

const changedDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const formatChangedDate = (iso: string): string | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : changedDateFormatter.format(date);
};

// Disabled "Download" affordance for the export row. Export is not wired
// to a backend yet, so it renders dimmed like the deferred OAuth / forgot
// links rather than as a dead control.
// TODO(profile-export): enable once the BFF exposes a data-export endpoint.
const downloadLinkClass = css({
  font: '[inherit]',
  fontSize: '[14px]',
  fontWeight: 600,
  color: 'green.deep',
  background: '[transparent]',
  borderWidth: '[0]',
  padding: '[0]',
  cursor: 'not-allowed',
  opacity: 0.55,
  flexShrink: 0
});

// "Account & data". Phase-1 surface: Email + Password rows render
// the current value (or a placeholder) and a disabled action link
// labelled "Change" / "Update". The change / update / delete /
// export flows land in a follow-up PR; the disabled state is
// announced via `aria-label` so SR users get the "coming soon"
// hint instead of a silent dead control.
export function AccountDataCard({ email, passwordChangedAt }: Props) {
  const changedOn = passwordChangedAt ? formatChangedDate(passwordChangedAt) : null;
  const passwordHelper = changedOn
    ? `Last changed ${changedOn}`
    : 'Rotate when you suspect a leak or every few months.';
  return (
    <section
      className={cx(panel({ surface: 'paper' }).root, cardClass)}
      aria-label="Account & data"
    >
      <h2 className={cardTitleClass}>Account & data</h2>

      <div className={cx(rowClass, firstRowClass)}>
        <div className={labelStackClass}>
          <span className={eyebrowClass}>Email</span>
          <span className={primaryClass}>{email}</span>
          <span className={helperClass}>Used for sign-in and account recovery</span>
        </div>
        <ChangeEmailButton currentEmail={email} />
      </div>

      <div className={rowClass}>
        <div className={labelStackClass}>
          <span className={eyebrowClass}>Password</span>
          <span className={primaryClass}>•••••••••••</span>
          <span className={helperClass}>{passwordHelper}</span>
        </div>
        <UpdatePasswordButton />
      </div>

      <div className={rowClass}>
        <div className={labelStackClass}>
          <span className={eyebrowClass}>Export your data</span>
          <span className={primaryClass}>Download a copy of every attempt and score</span>
        </div>
        <button type="button" className={downloadLinkClass} disabled title="Coming soon">
          Download
        </button>
      </div>
    </section>
  );
}
