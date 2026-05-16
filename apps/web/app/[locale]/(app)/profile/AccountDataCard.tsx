import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

type Props = {
  email: string;
};

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

const linkClass = css({
  font: '[inherit]',
  fontSize: '[14px]',
  fontWeight: 600,
  color: 'teal.deep',
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  cursor: 'pointer',
  _disabled: { color: 'ink.muted', cursor: 'not-allowed' }
});

// "Account & data". Phase-1 surface: Email + Password rows render
// the current value (or a placeholder) and a disabled action link
// labelled "Change" / "Update". The change / update / delete /
// export flows land in a follow-up PR; the disabled state is
// announced via `aria-label` so SR users get the "coming soon"
// hint instead of a silent dead control.
export function AccountDataCard({ email }: Props) {
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
        <button
          type="button"
          className={linkClass}
          disabled
          aria-label="Change email — coming soon"
        >
          Change
        </button>
      </div>

      <div className={rowClass}>
        <div className={labelStackClass}>
          <span className={eyebrowClass}>Password</span>
          <span className={primaryClass}>•••••••••••</span>
          <span className={helperClass}>Last changed — unknown</span>
        </div>
        <button
          type="button"
          className={linkClass}
          disabled
          aria-label="Update password — coming soon"
        >
          Update
        </button>
      </div>
    </section>
  );
}
