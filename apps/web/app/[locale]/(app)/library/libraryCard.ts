import { css } from '../../../../styled-system/css';

// The parts the Continue and Suggested cards share.

export const cardLayoutClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  padding: '4'
});

export const eyebrowClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  textStyle: 'labelLarge',
  color: 'primary'
});

export const titleRowClass = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '2'
});

export const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleLarge' });

export const bodyClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

/** The card's last row, at its bottom edge when the other card is taller. */
export const actionsClass = css({
  marginTop: 'auto',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '2'
});

/** A button whose label is followed by an arrow takes less padding on that side. */
export const arrowButtonClass = css({ paddingInlineEnd: '4' });
