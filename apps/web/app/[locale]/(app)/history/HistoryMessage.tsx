import type { ReactNode } from 'react';
import { Link } from '../../../../i18n/navigation';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

interface Props {
  /** The paths of a 24px icon. */
  icon: ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}

const messageClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2',
  paddingBlock: '12',
  textAlign: 'center',
  color: 'onSurfaceVariant'
});

const titleClass = css({ margin: '0', color: 'onSurface', textStyle: 'titleMedium' });

const bodyClass = css({ margin: '0', maxWidth: '[420px]', textStyle: 'bodyMedium' });

// A label followed by an arrow takes less padding on that side.
const ctaClass = cx(
  appButton({ variant: 'filled' }),
  css({ marginTop: '2', paddingInlineEnd: '4' })
);

/** What the page shows in place of the attempts, and where to go next. */
export function HistoryMessage({ icon, title, body, href, cta }: Props) {
  return (
    <div className={messageClass}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
      <h2 className={titleClass}>{title}</h2>
      <p className={bodyClass}>{body}</p>
      <Link href={href} className={ctaClass}>
        {cta} <ArrowRightIcon size={18} />
      </Link>
    </div>
  );
}
