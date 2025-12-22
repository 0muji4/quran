import { Router } from 'express';
import type { AuthedRequest } from './auth';
import { findSurah, surahs } from './data';

export const rscRouter = Router();

rscRouter.get('/surahs', (req: AuthedRequest, res) => {
  res.json({
    user: req.session ?? null,
    surahs: surahs.map((surah) => ({
      id: surah.id,
      nameEn: surah.nameEn,
      nameAr: surah.nameAr,
      ayahCount: surah.ayahCount,
      revelationPlace: surah.revelationPlace
    }))
  });
});

rscRouter.get('/surah/:surahId/ayahs', (req: AuthedRequest, res) => {
  const surah = findSurah(req.params.surahId);

  if (!surah) {
    res.status(404).json({ error: 'Surah not found' });
    return;
  }

  res.json({
    user: req.session ?? null,
    surah: {
      id: surah.id,
      nameEn: surah.nameEn,
      nameAr: surah.nameAr
    },
    ayahs: surah.ayahs
  });
});
