import { css } from '../../../../styled-system/css';

/** A non-interactive chip on the profile card. */
export const badgeClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '[32px]',
  paddingInline: '3',
  borderRadius: 'small',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'outlineVariant',
  color: 'onSurfaceVariant',
  textStyle: 'labelLarge'
});
