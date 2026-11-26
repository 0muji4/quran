import { getTranslations } from 'next-intl/server';
import { css } from '../../../../styled-system/css';

// Al-Muzzammil 73:4, the ayah the app is named after. The Arabic text is the
// same in every UI language, so it stays here rather than in the messages.
const AYAH_AR = 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا';

// Shown from the expanded window size class, beside the form.
const panelClass = css({
  display: 'none',
  expanded: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '4',
    minHeight: '[520px]',
    margin: '0',
    padding: '12',
    borderRadius: 'extraLarge',
    background: 'primaryContainer',
    color: 'onPrimaryContainer'
  }
});

const ayahClass = css({
  margin: '0',
  fontFamily: 'quran',
  fontSize: '[3rem]',
  lineHeight: '[1.9]'
});

const captionClass = css({ display: 'flex', flexDirection: 'column', gap: '1' });

const translationClass = css({ textStyle: 'titleLarge' });

const citationClass = css({ textStyle: 'bodyMedium' });

/** The ayah the app is named after, with its translation and citation. */
export async function AyahPanel() {
  const t = await getTranslations('auth.ayah');

  return (
    <figure className={panelClass}>
      <blockquote className={ayahClass} lang="ar" dir="rtl">
        {AYAH_AR}
      </blockquote>
      <figcaption className={captionClass}>
        <span className={translationClass}>{t('translation')}</span>
        <span className={citationClass}>{t('citation')}</span>
      </figcaption>
    </figure>
  );
}
