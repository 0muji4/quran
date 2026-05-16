import { BookIcon } from '../components/icons/BookIcon';
import { MihrabIllustration } from './icons/MihrabIllustration';
import { BRAND_COPY } from './copy';
import { css, cx } from '../../styled-system/css';

// Faint gold diamond lattice — two crossed line gratings at low alpha
// so they sit under the foreground text without competing. Kept as a
// single bracket-escaped literal because the value is intricate and
// would not benefit from token decomposition.
const BRAND_LATTICE_BG =
  'repeating-linear-gradient(45deg, transparent, transparent 22px, rgba(217, 178, 106, 0.045) 22px, rgba(217, 178, 106, 0.045) 23px), repeating-linear-gradient(-45deg, transparent, transparent 22px, rgba(217, 178, 106, 0.045) 22px, rgba(217, 178, 106, 0.045) 23px)';

const brandPanelClass = css({
  display: 'flex',
  flexDirection: 'column',
  paddingBlock: '10',
  paddingInline: '8',
  backgroundColor: 'bg.brandDark',
  backgroundImage: `[${BRAND_LATTICE_BG}]`,
  color: 'ink.onDark',
  // The brand panel is decorative — drop it on mobile so the form owns
  // the viewport instead of being pushed below a tall illustration.
  '@media (max-width: 720px)': { display: 'none' }
});

const wordmarkClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3'
});

const wordmarkIconClass = css({
  display: 'inline-flex',
  color: 'gold.onDark'
});

const wordmarkTextClass = css({
  display: 'flex',
  flexDirection: 'column',
  lineHeight: '[1.1]'
});

const wordmarkTitleClass = css({
  fontFamily: 'serif',
  fontSize: '[20px]',
  fontWeight: 600,
  color: 'ink.onDark'
});

const wordmarkKickerClass = css({
  marginTop: '[2px]',
  fontSize: '[10px]',
  letterSpacing: '[0.18em]',
  textTransform: 'uppercase',
  color: 'ink.onDarkMut'
});

const mihrabClass = css({
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingBlock: '8',
  paddingInline: '[0]'
});

const ayahBlockClass = css({
  margin: '[0]',
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  maxWidth: '[400px]'
});

const ayahTextClass = css({
  margin: '[0]',
  fontSize: '[26px]',
  lineHeight: '[1.9]',
  color: 'gold.onDark'
});

const ayahCaptionClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  fontSize: '[13px]',
  fontStyle: 'normal',
  lineHeight: '[1.5]',
  color: 'ink.onDarkMut'
});

const ayahCitationClass = css({
  fontSize: '[11px]',
  letterSpacing: '[0.12em]',
  textTransform: 'uppercase',
  color: 'gold.onDark'
});

// The dark left panel of the auth screen: wordmark, the mihrab
// illustration, and the Al-Muzzammil ayah the app is named after.
// Hidden on narrow viewports — it is brand showcase, not part of the
// form flow.
export function AuthBrandPanel() {
  return (
    <aside className={brandPanelClass}>
      <div className={wordmarkClass}>
        <span className={wordmarkIconClass} aria-hidden="true">
          <BookIcon size={22} />
        </span>
        <span className={wordmarkTextClass}>
          <span className={wordmarkTitleClass}>{BRAND_COPY.wordmark}</span>
          <span className={wordmarkKickerClass}>{BRAND_COPY.kicker}</span>
        </span>
      </div>

      <div className={mihrabClass}>
        <MihrabIllustration />
      </div>

      <figure className={ayahBlockClass}>
        <blockquote className={cx(ayahTextClass, 'ar-text')} lang="ar">
          {BRAND_COPY.ayah}
        </blockquote>
        <figcaption className={ayahCaptionClass}>
          “{BRAND_COPY.ayahTranslation}”
          <span className={ayahCitationClass}>{BRAND_COPY.ayahCitation}</span>
        </figcaption>
      </figure>
    </aside>
  );
}
