import { css } from '../../../../styled-system/css';

interface Props {
  label: string;
}

const dividerClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  color: 'onSurfaceVariant',
  textStyle: 'bodyMedium',
  // The rules are flex-1 pseudo-elements either side of the label, so the
  // label sits in a gap rather than on top of a line.
  '&::before, &::after': {
    content: '""',
    flex: '1',
    height: '[1px]',
    backgroundColor: 'outlineVariant'
  }
});

// The "or" between the email form and the sign-in providers. Only the label
// is real text; the lines are pseudo-elements.
export function Divider({ label }: Props) {
  return <div className={dividerClass}>{label}</div>;
}
