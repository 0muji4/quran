export type AyahRecord = {
  id: string;
  surahId: string;
  ayahNumber: number;
  textAr: string;
  textEn?: string;
  transliteration?: string;
  metadata?: Record<string, unknown>;
};

export type SurahRecord = {
  id: string;
  nameAr: string;
  nameEn: string;
  revelationPlace: string;
  ayahCount: number;
  metadata?: Record<string, unknown>;
  ayahs: AyahRecord[];
};

export const surahs: SurahRecord[] = [
  {
    id: '1',
    nameAr: 'الفاتحة',
    nameEn: 'Al-Fātiḥah',
    revelationPlace: 'Mecca',
    ayahCount: 7,
    ayahs: [
      {
        id: '1:1',
        surahId: '1',
        ayahNumber: 1,
        textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        textEn: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        transliteration: 'Bismi llahi r-raḥmani r-raḥīm'
      },
      {
        id: '1:7',
        surahId: '1',
        ayahNumber: 7,
        textAr: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ',
        textEn: 'The path of those upon whom You have bestowed favor',
        transliteration: 'Ṣirāṭ al-ladhīna anʿamta ʿalayhim'
      }
    ]
  },
  {
    id: '112',
    nameAr: 'الإخلاص',
    nameEn: 'Al-Ikhlāṣ',
    revelationPlace: 'Mecca',
    ayahCount: 4,
    metadata: { theme: 'Sincerity' },
    ayahs: [
      {
        id: '112:1',
        surahId: '112',
        ayahNumber: 1,
        textAr: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
        textEn: 'Say, "He is Allah, [who is] One"',
        transliteration: 'Qul huwallahu ahad'
      },
      {
        id: '112:4',
        surahId: '112',
        ayahNumber: 4,
        textAr: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
        textEn: 'Nor is there to Him any equivalent',
        transliteration: 'Walam yakun lahu kufuwan aḥad'
      }
    ]
  }
];

export const findSurah = (id: string): SurahRecord | undefined =>
  surahs.find((surah) => surah.id === id);

export const findAyah = (surahId: string, ayahNumber: number): AyahRecord | undefined =>
  findSurah(surahId)?.ayahs.find((ayah) => ayah.ayahNumber === ayahNumber);
