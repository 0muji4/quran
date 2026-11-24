import { css } from '../../../../styled-system/css';

interface Props {
  name: string;
}

// Large enough for Amiri's marks to read beside a list item's text.
const nameClass = css({
  flexShrink: 0,
  fontFamily: 'quran',
  fontSize: '[1.375rem]',
  lineHeight: '[1.4]',
  whiteSpace: 'nowrap'
});

/** A surah's Arabic name in Amiri. It repeats the English name beside it. */
export function SurahNameArabic({ name }: Props) {
  return (
    <span className={nameClass} lang="ar" dir="rtl" aria-hidden="true">
      {name}
    </span>
  );
}
