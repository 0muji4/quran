import { getLocale, getTranslations } from 'next-intl/server';
import { Link, redirect } from '../../../../../../i18n/navigation';
import { fetchSurahAyahs, fetchSurahs } from '../../../../../actions';
import type { AyahRecord, SurahSummary } from '../../../../../lib/types';
import { AyahDisplayCard } from '../../AyahDisplayCard';
import { AyahProgressBar } from '../../AyahProgressBar';
import { RecorderPanel } from '../../RecorderPanel';
import { TeacherPanel } from '../../TeacherPanel';
import { ChevronIcon } from '../../../../../components/icons/ChevronIcon';
import { css, cx } from '../../../../../../styled-system/css';
import { appIconButton } from '../../../../../../styled-system/recipes';

interface RouteParams {
  surahId: string;
  ayahNumber: string;
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

// Compact: a top app bar (back, title, previous and next as icon buttons).
// From medium: a back link above the title, previous and next as buttons.
const headerClass = css({
  display: 'grid',
  gridTemplateColumns: '[auto minmax(0, 1fr) auto]',
  gridTemplateAreas: '"back title nav"',
  alignItems: 'center',
  minHeight: '[64px]',
  paddingInline: '1',
  medium: {
    gridTemplateColumns: '[minmax(0, 1fr) auto]',
    gridTemplateAreas: '"back nav" "title nav"',
    rowGap: '[2px]',
    paddingInline: '6',
    paddingTop: '5',
    paddingBottom: '2'
  }
});

const backClass = css({
  gridArea: 'back',
  medium: {
    justifySelf: 'start',
    width: 'auto',
    height: 'auto',
    minHeight: '[32px]',
    margin: '0',
    paddingInline: '1',
    gap: '1',
    color: 'primary',
    textStyle: 'labelLarge'
  }
});

const titleClass = css({ gridArea: 'title', minWidth: '[0]' });

// Headings take the colour of their container; the old global heading rule
// would otherwise draw them in the old ink colour.
const headingClass = css({
  margin: '0',
  color: '[inherit]',
  textStyle: 'titleLarge',
  medium: { textStyle: 'headlineMedium' }
});

const subtitleClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const ayahNavClass = css({ gridArea: 'nav', display: 'flex', medium: { gap: '2' } });

// Previous and next are icon buttons in a compact window and outlined
// buttons from medium; one element carries both looks.
const stepClass = cx(
  appIconButton({ variant: 'standard' }),
  css({
    color: 'onSurface',
    medium: {
      width: 'auto',
      height: '[40px]',
      margin: '0',
      gap: '2',
      paddingInline: '4',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'outlineVariant',
      color: 'primary',
      textStyle: 'labelLarge'
    }
  })
);

const stepLabelClass = css({ srOnly: true, medium: { srOnly: false } });

const progressClass = css({
  paddingInline: '4',
  paddingTop: '1',
  paddingBottom: '3',
  medium: { paddingInline: '6', paddingTop: '2', paddingBottom: '4' }
});

// Expanded windows put the ayah beside the teacher and the recorder.
const bodyClass = css({
  display: 'grid',
  gap: '3',
  width: '[100%]',
  maxWidth: '[720px]',
  marginInline: 'auto',
  paddingInline: '4',
  paddingBottom: '4',
  alignItems: 'start',
  medium: { gap: '4', paddingInline: '6', paddingBottom: '6' },
  expanded: {
    gridTemplateColumns: '[minmax(0, 1.1fr) minmax(0, 1fr)]',
    maxWidth: '[1120px]'
  }
});

const panelsClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  medium: { gap: '4' }
});

export default async function PracticePage({ params }: { params: Promise<RouteParams> }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('practice.page')]);
  const { surahId, ayahNumber: ayahNumberRaw } = await params;
  const requestedAyah = Number(ayahNumberRaw);

  // Tolerate transient BFF errors (e.g. 4xx for an unknown surah, or BFF
  // not yet ready) by treating them like a missing surah and redirecting
  // back to the library.
  let surahs: SurahSummary[] = [];
  let ayahs: AyahRecord[] = [];
  try {
    [surahs, ayahs] = await Promise.all([fetchSurahs(), fetchSurahAyahs(surahId)]);
  } catch {
    redirect({ href: '/', locale });
  }
  const surah = surahs.find((s) => s.id === surahId);

  if (!surah || ayahs.length === 0) {
    redirect({ href: '/', locale });
  }

  const ayahNumber = Number.isFinite(requestedAyah) && requestedAyah > 0 ? requestedAyah : 1;
  const selectedAyah = ayahs.find((a) => a.ayahNumber === ayahNumber) ?? ayahs[0];
  const currentAyah = selectedAyah.ayahNumber;
  const totalAyahs = ayahs.length;
  const prevAyah = currentAyah > 1 ? currentAyah - 1 : null;
  const nextAyah = currentAyah < totalAyahs ? currentAyah + 1 : null;
  const position = t('ayahOf', { ayah: currentAyah, total: totalAyahs });

  return (
    <div className={pageClass} data-full-bleed>
      <header className={headerClass}>
        <Link
          href="/"
          className={cx(
            appIconButton({ variant: 'standard' }),
            css({ color: 'onSurface' }),
            backClass
          )}
        >
          <ChevronIcon direction="back" size={24} />
          <span className={stepLabelClass}>{t('library')}</span>
        </Link>
        <div className={titleClass}>
          <h1 className={headingClass}>{surah.nameEn}</h1>
          <p className={subtitleClass}>{position}</p>
        </div>
        <nav className={ayahNavClass} aria-label={t('ayahNavAriaLabel')}>
          {prevAyah !== null ? (
            <Link href={`/practice/${surahId}/${prevAyah}`} className={stepClass}>
              <ChevronIcon direction="back" size={20} />
              <span className={stepLabelClass}>{t('prev')}</span>
            </Link>
          ) : (
            <span className={stepClass} aria-disabled="true">
              <ChevronIcon direction="back" size={20} />
              <span className={stepLabelClass}>{t('prev')}</span>
            </span>
          )}
          {nextAyah !== null ? (
            <Link href={`/practice/${surahId}/${nextAyah}`} className={stepClass}>
              <span className={stepLabelClass}>{t('next')}</span>
              <ChevronIcon direction="forward" size={20} />
            </Link>
          ) : (
            <span className={stepClass} aria-disabled="true">
              <span className={stepLabelClass}>{t('next')}</span>
              <ChevronIcon direction="forward" size={20} />
            </span>
          )}
        </nav>
      </header>

      <div className={progressClass}>
        <AyahProgressBar total={totalAyahs} current={currentAyah} label={position} />
      </div>

      <div className={bodyClass}>
        <AyahDisplayCard ayah={selectedAyah} surahNameEn={surah.nameEn} />
        <div className={panelsClass}>
          <TeacherPanel surahId={Number(surah.id)} ayahNumber={selectedAyah.ayahNumber} />
          <RecorderPanel
            key={`${surah.id}:${selectedAyah.ayahNumber}`}
            surah={surah}
            ayah={selectedAyah}
          />
        </div>
      </div>
    </div>
  );
}
