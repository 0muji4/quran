import { BookIcon } from '../components/icons/BookIcon';
import { MihrabIllustration } from './icons/MihrabIllustration';
import { BRAND_COPY } from './copy';
import styles from '../styles/auth.module.css';

// The dark left panel of the auth screen: wordmark, the mihrab
// illustration, and the Al-Muzzammil ayah the app is named after. Hidden
// on narrow viewports (see auth.module.css) — it is brand showcase, not
// part of the form flow.
export function AuthBrandPanel() {
  return (
    <aside className={styles.brandPanel}>
      <div className={styles.wordmark}>
        <span className={styles.wordmarkIcon} aria-hidden="true">
          <BookIcon size={22} />
        </span>
        <span className={styles.wordmarkText}>
          <span className={styles.wordmarkTitle}>{BRAND_COPY.wordmark}</span>
          <span className={styles.wordmarkKicker}>{BRAND_COPY.kicker}</span>
        </span>
      </div>

      <div className={styles.mihrab}>
        <MihrabIllustration />
      </div>

      <figure className={styles.ayahBlock}>
        <blockquote className={`${styles.ayahText} ar-text`} lang="ar">
          {BRAND_COPY.ayah}
        </blockquote>
        <figcaption className={styles.ayahCaption}>
          “{BRAND_COPY.ayahTranslation}”
          <span className={styles.ayahCitation}>{BRAND_COPY.ayahCitation}</span>
        </figcaption>
      </figure>
    </aside>
  );
}
