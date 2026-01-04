import type { ScoreSegment, ScoringResult, SignedUploadUrl } from '@quran-project/shared-ts';
import type { AyahRecord, SurahSummary } from '../../app/lib/types';

export const mockSurahs: SurahSummary[] = [
  {
    id: '1',
    nameEn: 'Al-Fatihah',
    nameAr: 'الفاتحة',
    ayahCount: 7,
    revelationPlace: 'Meccan'
  },
  {
    id: '2',
    nameEn: 'Al-Baqarah',
    nameAr: 'البقرة',
    ayahCount: 286,
    revelationPlace: 'Medinan'
  },
  {
    id: '114',
    nameEn: 'An-Nas',
    nameAr: 'الناس',
    ayahCount: 6,
    revelationPlace: 'Meccan'
  }
];

export const mockAyahs: AyahRecord[] = [
  {
    id: '1:1',
    surahId: '1',
    ayahNumber: 1,
    textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    textEn: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    transliteration: 'Bismillahir Rahmanir Raheem'
  },
  {
    id: '1:2',
    surahId: '1',
    ayahNumber: 2,
    textAr: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    textEn: 'All praise is due to Allah, Lord of the worlds.',
    transliteration: 'Alhamdu lillahi rabbil aalameen'
  },
  {
    id: '1:3',
    surahId: '1',
    ayahNumber: 3,
    textAr: 'الرَّحْمَٰنِ الرَّحِيمِ',
    textEn: 'The Entirely Merciful, the Especially Merciful.',
    transliteration: 'Ar-Rahmanir-Raheem'
  }
];

export const mockSegments: ScoreSegment[] = [
  {
    label: 'word1',
    score: 0.95,
    metrics: {
      duration: '500ms',
      confidence: 0.98
    }
  },
  {
    label: 'word2',
    score: 0.78,
    metrics: null
  },
  {
    label: 'word3',
    score: 0.65,
    metrics: {
      duration: '450ms'
    }
  }
];

export const mockSignedUploadUrl: SignedUploadUrl = {
  url: 'https://storage.example.com/upload',
  uploadKey: 'uploads/test-upload-key.webm',
  sessionId: 'session-123',
  expiresAt: '2024-12-31T23:59:59.000Z',
  fields: {
    key: 'uploads/test-upload-key.webm',
    bucket: 'test-bucket'
  }
};

export const mockScoringResult: ScoringResult = {
  jobId: 'job-123',
  status: 'COMPLETED',
  createdAt: '2024-01-04T12:00:00.000Z',
  uploadKey: 'uploads/test-upload-key.webm',
  score: 0.85,
  segments: mockSegments,
  feedback: {
    accuracy: 0.9,
    fluency: 0.85,
    completeness: 0.88,
    overall: 0.87,
    transcript: 'bismillahir rahmanir raheem',
    wer: 0.1,
    wordAlignments: [
      {
        word: 'bismillahir',
        start: 0,
        end: 0.5,
        score: 0.95
      },
      {
        word: 'rahmanir',
        start: 0.5,
        end: 1.0,
        score: 0.9
      },
      {
        word: 'raheem',
        start: 1.0,
        end: 1.5,
        score: 0.88
      }
    ],
    referenceAudioUrl: 'https://example.com/reference.mp3'
  },
  verdict: 'Excellent pronunciation!',
  evaluation: {
    strengths: ['Clear pronunciation', 'Good fluency'],
    improvements: ['Work on timing']
  }
};

export const mockScoringResultQueued: ScoringResult = {
  ...mockScoringResult,
  status: 'QUEUED',
  score: undefined,
  segments: [],
  feedback: undefined,
  verdict: undefined,
  evaluation: undefined
};

export const mockScoringResultRunning: ScoringResult = {
  ...mockScoringResult,
  status: 'RUNNING',
  score: undefined,
  segments: [mockSegments[0]],
  feedback: undefined,
  verdict: undefined,
  evaluation: undefined
};

export const mockScoringResultFailed: ScoringResult = {
  ...mockScoringResult,
  status: 'FAILED',
  score: undefined,
  segments: [],
  feedback: undefined,
  verdict: 'Scoring failed due to audio quality issues',
  evaluation: undefined
};
