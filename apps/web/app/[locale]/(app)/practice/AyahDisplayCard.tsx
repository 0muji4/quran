import type { AyahRecord } from '../../../lib/types';
import { css, cx } from '../../../../styled-system/css';
import { appCard } from '../../../../styled-system/recipes';

interface Props {
  ayah: AyahRecord;
  surahNameEn: string;
}

const cardClass = cx(
  appCard({ variant: 'elevated' }),
  css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2',
    paddingInline: '5',
    paddingTop: '5',
    paddingBottom: '4',
    textAlign: 'center'
  })
);

// The ayah number in its ornament ring, in Arabic-Indic digits as in the apps.
const medallionClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '[2.5rem]',
  height: '[2.5rem]',
  paddingInline: '2',
  borderRadius: 'full',
  borderWidth: '[1.5px]',
  borderStyle: 'solid',
  borderColor: 'ornament',
  textStyle: 'quran.ayahNumber'
});

// Long ayahs scroll inside the card in an expanded window, so the teacher
// and the recorder beside it stay in view.
const arabicClass = css({
  width: '[100%]',
  margin: '0',
  marginTop: '1',
  textStyle: 'quran.ayah',
  lineHeight: '[1.9]',
  expanded: { fontSize: '[2.5rem]', maxHeight: '[60vh]', overflowY: 'auto' }
});

const transliterationClass = css({
  margin: '0',
  textStyle: 'bodyMedium',
  fontStyle: 'italic',
  color: 'onSurfaceVariant'
});

const translationClass = css({ margin: '0', textStyle: 'bodyMedium', color: 'onSurfaceVariant' });

const arabicDigits = new Intl.NumberFormat('ar-EG', { useGrouping: false });

export function AyahDisplayCard({ ayah, surahNameEn }: Props) {
  return (
    <section className={cardClass} aria-label={`Ayah ${ayah.ayahNumber} of ${surahNameEn}`}>
      <span className={medallionClass} lang="ar" aria-hidden="true">
        {arabicDigits.format(ayah.ayahNumber)}
      </span>
      <p className={arabicClass} dir="rtl" lang="ar">
        {ayah.textAr}
      </p>
      {ayah.transliteration && <p className={transliterationClass}>{ayah.transliteration}</p>}
      {ayah.textEn && <p className={translationClass}>{ayah.textEn}</p>}
    </section>
  );
}
