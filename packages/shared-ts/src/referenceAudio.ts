const RECITER = 'Husary_Muallim_128kbps' as const;
const REFERENCE_AUDIO_PREFIX = 'reference-audio/' as const;
const SURAH_MIN = 1;
const SURAH_MAX = 114;
const AYAH_MIN = 1;
const AYAH_MAX = 286;

const validate = (surahId: number, ayahNumber: number): void => {
  if (!Number.isInteger(surahId) || surahId < SURAH_MIN || surahId > SURAH_MAX) {
    throw new RangeError(`invalid surahId: ${surahId}`);
  }
  if (!Number.isInteger(ayahNumber) || ayahNumber < AYAH_MIN || ayahNumber > AYAH_MAX) {
    throw new RangeError(`invalid ayahNumber: ${ayahNumber}`);
  }
};

const padded = (surahId: number, ayahNumber: number): string =>
  `${String(surahId).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}`;

export const referenceAudioKey = (surahId: number, ayahNumber: number): string => {
  validate(surahId, ayahNumber);
  return `${REFERENCE_AUDIO_PREFIX}${padded(surahId, ayahNumber)}.mp3`;
};

export const everyAyahSourceUrl = (surahId: number, ayahNumber: number): string => {
  validate(surahId, ayahNumber);
  return `https://everyayah.com/data/${RECITER}/${padded(surahId, ayahNumber)}.mp3`;
};
