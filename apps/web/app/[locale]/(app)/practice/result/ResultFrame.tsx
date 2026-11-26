import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/navigation';
import { ChevronIcon } from '../../../../components/icons/ChevronIcon';
import { css, cx } from '../../../../../styled-system/css';
import { appIconButton } from '../../../../../styled-system/recipes';

interface Props {
  surahId: string;
  surahName: string;
  ayahNumber: number;
  children: ReactNode;
}

const pageClass = css({ flex: '1', display: 'flex', flexDirection: 'column' });

// Compact: a top app bar (back, title, the ayah). From medium: a back link
// naming the ayah above the title.
const headerClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  minHeight: '[64px]',
  paddingInline: '1',
  medium: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '[2px]',
    minHeight: '[0]',
    paddingInline: '6',
    paddingTop: '5',
    paddingBottom: '3'
  }
});

const backClass = cx(
  appIconButton({ variant: 'standard' }),
  css({
    color: 'onSurface',
    medium: {
      width: 'auto',
      height: 'auto',
      minHeight: '[32px]',
      margin: '0',
      paddingInline: '1',
      gap: '1',
      color: 'primary',
      textStyle: 'labelLarge'
    }
  })
);

// The back control is an icon button in a compact window, named for where it
// goes, and a text link from medium, named by its visible text.
const backNameCompactClass = css({ srOnly: true, medium: { display: 'none' } });
const backNameWideClass = css({ display: 'none', medium: { display: 'inline' } });

const titleBlockClass = css({ flex: '1', minWidth: '[0]' });

const titleClass = css({
  margin: '0',
  textStyle: 'titleLarge',
  medium: { textStyle: 'headlineMedium' }
});

const subtitleClass = css({
  margin: '0',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant',
  medium: { display: 'none' }
});

// One column up to medium; expanded windows put the word comparison beside
// listen back. Sections that span the row set `gridColumn: '1 / -1'`.
const bodyClass = css({
  display: 'grid',
  gap: '3',
  alignContent: 'start',
  width: '[100%]',
  maxWidth: '[720px]',
  marginInline: 'auto',
  paddingInline: '4',
  paddingTop: '1',
  paddingBottom: '4',
  medium: { gap: '4', paddingInline: '6', paddingTop: '0', paddingBottom: '6' },
  expanded: {
    gridTemplateColumns: '[minmax(0, 1.4fr) minmax(0, 1fr)]',
    maxWidth: '[1120px]'
  }
});

/** The result page's surface, header and content grid, shared by every state. */
export function ResultFrame({ surahId, surahName, ayahNumber, children }: Props) {
  const t = useTranslations('result');
  const ayahLabel = t('subtitle', { surah: surahName, ayah: ayahNumber });

  return (
    <div className={pageClass}>
      <header className={headerClass}>
        <Link href={`/practice/${surahId}/${ayahNumber}`} className={backClass}>
          <ChevronIcon direction="back" size={24} />
          <span className={backNameCompactClass}>
            {t('backAriaLabel', { surah: surahName, ayah: ayahNumber })}
          </span>
          <span className={backNameWideClass}>{ayahLabel}</span>
        </Link>
        <div className={titleBlockClass}>
          <p className={titleClass}>{t('title')}</p>
          <p className={subtitleClass}>{ayahLabel}</p>
        </div>
      </header>
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

/** Spans every column of the content grid. */
export const fullRowClass = css({ gridColumn: '[1 / -1]' });
