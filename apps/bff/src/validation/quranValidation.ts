import { z } from 'zod';

/**
 * Validation schema for Surah ID
 * Validates that surahId is a numeric string between "1" and "114"
 * (the 114 surahs in the Quran)
 */
export const surahIdSchema = z
  .string()
  .regex(/^\d+$/, 'surahId must be a numeric string')
  .refine(
    (val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 114;
    },
    { message: 'surahId must be between 1 and 114' }
  );

/**
 * Validation schema for Ayah Number
 * Validates that ayahNumber is an integer between 1 and 286
 * (286 is the maximum number of ayahs in any surah - Surah Al-Baqarah)
 */
export const ayahNumberSchema = z
  .number()
  .int('ayahNumber must be an integer')
  .min(1, 'ayahNumber must be at least 1')
  .max(286, 'ayahNumber must be at most 286');
