import { css } from '../../../styled-system/css';

interface Props {
  label: string;
}

const dividerClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  marginBlock: '1',
  marginInline: '[0]',
  // The rule lines are drawn as flex-1 pseudo-elements either side of
  // the label, so the label sits in a typographic gap rather than on
  // top of an underline.
  '&::before, &::after': {
    content: '""',
    flex: '1',
    height: '[1px]',
    backgroundColor: 'border'
  }
});

const labelClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  letterSpacing: '[0.16em]',
  textTransform: 'uppercase',
  color: 'ink.muted'
});

// "OR" / "OR WITH EMAIL" rule. Only the label is real text; the lines
// are pseudo-elements.
export function Divider({ label }: Props) {
  return (
    <div className={dividerClass}>
      <span className={labelClass}>{label}</span>
    </div>
  );
}
