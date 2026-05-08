import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import styles from '../../styles/practice.module.css';

type Props = {
  surahId: string;
  ayahNumber: number;
  totalAyahs: number;
};

export function ActionRow({ surahId, ayahNumber, totalAyahs }: Props) {
  const tryAgainHref = `/practice?surah=${surahId}&ayah=${ayahNumber}`;
  const isLastAyah = ayahNumber >= totalAyahs;
  const continueHref = isLastAyah ? '/' : `/practice?surah=${surahId}&ayah=${ayahNumber + 1}`;
  const continueLabel = isLastAyah ? 'Finish surah' : `Continue to ayah ${ayahNumber + 1}`;

  return (
    <div className={styles.resultActionRow}>
      <Link href={tryAgainHref} className={styles.btnGhost}>
        <ArrowLeftIcon /> Try this ayah again
      </Link>
      <Link href={continueHref} className={`${styles.btnTeal} ${styles.resultPrimaryBtn}`}>
        {continueLabel} <ArrowRightIcon />
      </Link>
    </div>
  );
}
