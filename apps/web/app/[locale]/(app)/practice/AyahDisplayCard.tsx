import type { AyahRecord } from '../../../lib/types';
import { CornerOrnament } from '../../../components/icons/CornerOrnament';
import { StarOrnament } from '../../../components/icons/StarOrnament';
import styles from '../../../styles/practice.module.css';

type Props = {
  ayah: AyahRecord;
  surahNameEn: string;
};

export function AyahDisplayCard({ ayah, surahNameEn }: Props) {
  return (
    <section className={styles.ayahCard} aria-label={`Ayah ${ayah.ayahNumber} of ${surahNameEn}`}>
      <CornerOrnament position="tl" className={`${styles.ayahCorner} ${styles.ayahCornerTL}`} />
      <CornerOrnament position="tr" className={`${styles.ayahCorner} ${styles.ayahCornerTR}`} />
      <CornerOrnament position="bl" className={`${styles.ayahCorner} ${styles.ayahCornerBL}`} />
      <CornerOrnament position="br" className={`${styles.ayahCorner} ${styles.ayahCornerBR}`} />

      <p className={styles.ayahCaption}>
        Ayah {ayah.ayahNumber} — {surahNameEn}
      </p>
      <div className={styles.ayahLine}>
        <StarOrnament number={ayah.ayahNumber} size={56} />
        <p className={styles.ayahArabic} dir="rtl" lang="ar">
          {ayah.textAr}
        </p>
      </div>
      {ayah.transliteration && <p className={styles.ayahTransliteration}>{ayah.transliteration}</p>}
      {ayah.textEn && <p className={styles.ayahTranslation}>{ayah.textEn}</p>}
    </section>
  );
}
