import type { ReactNode } from 'react';
import { css } from '../../styled-system/css';

interface Props {
  title: string;
  children: ReactNode;
}

// The page paints its own surface, so it follows the system light or dark
// setting while pages not yet rebuilt keep the old background (#673).
const pageClass = css({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  background: 'surface',
  color: 'onSurface',
  fontFamily: 'ui'
});

// The header and the body share one column, centred in wide windows.
const columnClass = {
  width: '[100%]',
  maxWidth: '[720px]',
  marginInline: 'auto',
  paddingInline: '4',
  medium: { paddingInline: '6' },
  expanded: { maxWidth: '[1120px]' }
} as const;

const headerClass = css(columnClass, {
  display: 'flex',
  alignItems: 'center',
  minHeight: '[64px]',
  medium: { paddingTop: '5', paddingBottom: '3' }
});

const titleClass = css({
  margin: '0',
  color: '[inherit]',
  textStyle: 'titleLarge',
  medium: { textStyle: 'headlineMedium' }
});

const bodyClass = css(columnClass, {
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  paddingTop: '1',
  paddingBottom: '4',
  medium: { paddingBottom: '6' }
});

/** A top-level page's surface, title and content column. */
export function PageFrame({ title, children }: Props) {
  return (
    <div className={pageClass} data-full-bleed>
      <header className={headerClass}>
        <h1 className={titleClass}>{title}</h1>
      </header>
      <div className={bodyClass}>{children}</div>
    </div>
  );
}
