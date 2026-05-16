import { LEVEL_OPTIONS } from './copy';
import { css } from '../../../styled-system/css';

type Props = {
  disabled?: boolean;
};

const groupClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  margin: '[0]',
  padding: '[0]',
  borderWidth: '[0]'
});

const legendClass = css({
  marginBottom: '1',
  padding: '[0]',
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'ink.default'
});

const legendHintClass = css({
  fontSize: '[12px]',
  fontWeight: 400,
  color: 'ink.muted'
});

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '2',
  '@media (max-width: 720px)': { gridTemplateColumns: '1fr' }
});

// :has(input:checked) drives the selected-state border / fill purely
// from CSS, so no client component / React state is required for the
// visual feedback.
const cardClass = css({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: '3',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  cursor: 'pointer',
  transition: '[border-color 0.15s ease, background 0.15s ease]',
  '&:has(input:checked)': {
    borderColor: 'teal',
    backgroundColor: 'mint.bg'
  },
  '&:has(input:focus-visible)': {
    outline: '[2px solid var(--colors-teal)]',
    outlineOffset: '[2px]'
  }
});

const radioClass = css({
  position: 'absolute',
  top: '2',
  right: '2',
  margin: '[0]',
  accentColor: 'teal'
});

const cardTextClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '[2px]',
  paddingRight: '4'
});

const cardTitleClass = css({
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'ink.strong'
});

const cardSubtitleClass = css({
  fontSize: '[12px]',
  lineHeight: '[1.3]',
  color: 'ink.muted'
});

// Sign-up "current level" picker. Native radios in a fieldset — the card
// styling is driven entirely by CSS (:has(:checked)), so no client state
// is needed. UI-only this pass: the value rides along in the form but is
// not read by the submit handler (see plan / copy.ts).
export function LevelSelector({ disabled }: Props) {
  return (
    <fieldset className={groupClass} disabled={disabled}>
      <legend className={legendClass}>
        Your current level <span className={legendHintClass}>(you can change this later)</span>
      </legend>
      <div className={gridClass}>
        {LEVEL_OPTIONS.map((option, index) => (
          <label key={option.value} className={cardClass}>
            <input
              type="radio"
              name="level"
              value={option.value}
              defaultChecked={index === 0}
              className={radioClass}
            />
            <span className={cardTextClass}>
              <span className={cardTitleClass}>{option.label}</span>
              <span className={cardSubtitleClass}>{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
