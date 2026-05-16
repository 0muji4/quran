import { css } from '../../styled-system/css';

type Props = {
  disabled?: boolean;
};

const optionsRowClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '3',
  flexWrap: 'wrap'
});

const checkboxLabelClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: '[13px]',
  color: 'ink.default',
  cursor: 'pointer'
});

const checkboxClass = css({
  width: '[16px]',
  height: '[16px]',
  accentColor: 'teal'
});

const forgotLinkClass = css({
  font: '[inherit]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'teal.deep',
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  padding: '[0]',
  cursor: 'pointer',
  _disabled: { color: 'ink.muted', fontWeight: 500, cursor: 'not-allowed' }
});

// Sign-in row: "Remember me" checkbox + "Forgot password?" link.
// Both are UI-only this pass — remember-me persists nothing (its session
// behaviour needs its own DesignDoc) and password reset is deferred per
// ADR 0010, so the link is a disabled button styled like a link, matching
// the OAuth buttons' "coming soon" treatment.
export function RememberMeRow({ disabled }: Props) {
  return (
    <div className={optionsRowClass}>
      <label className={checkboxLabelClass}>
        <input
          type="checkbox"
          name="rememberMe"
          className={checkboxClass}
          defaultChecked
          disabled={disabled}
        />
        Remember me on this device
      </label>
      <button
        type="button"
        className={forgotLinkClass}
        disabled
        aria-label="Forgot password? — coming soon"
      >
        Forgot password?
      </button>
    </div>
  );
}
