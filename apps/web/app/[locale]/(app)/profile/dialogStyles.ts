import { css } from '../../../../styled-system/css';

// The parts the profile dialogs share.

export const formClass = css({ display: 'flex', flexDirection: 'column', gap: '4' });

export const bodyClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

export const footnoteClass = css({
  margin: '0',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

export const actionsClass = css({
  marginTop: '2',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '2'
});
