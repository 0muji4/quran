import { css, cx } from '../../../../styled-system/css';
import { appCard } from '../../../../styled-system/recipes';

// The parts the profile cards share.

export const filledCardClass = cx(
  appCard({ variant: 'filled' }),
  css({ display: 'flex', flexDirection: 'column', padding: '4' })
);

export const cardTitleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

/** A row with its text at the start and its control at the end. */
export const rowClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4'
});

export const rowTextClass = css({ minWidth: '[0]', display: 'flex', flexDirection: 'column' });

export const primaryClass = css({ textStyle: 'bodyLarge', overflowWrap: 'anywhere' });

export const helperClass = css({ textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

export const dividedClass = css({
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: 'outlineVariant'
});
