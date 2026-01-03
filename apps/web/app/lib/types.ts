export type SurahSummary = {
  id: string;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
  revelationPlace: string;
};

export type AyahRecord = {
  id: string;
  surahId: string;
  ayahNumber: number;
  textAr: string;
  textEn?: string;
  transliteration?: string;
};
