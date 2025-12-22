import { randomUUID } from 'crypto';
import { GraphQLScalarType, Kind, valueFromASTUntyped } from 'graphql';
import type { GraphQLContext, Resolvers } from '@quran-project/shared-ts';
import { findAyah, findSurah, surahs } from './data';

const secondsFromNow = (seconds: number): string => new Date(Date.now() + seconds * 1000).toISOString();

const JSONObjectScalar = new GraphQLScalarType({
  name: 'JSONObject',
  serialize: (value) => value ?? null,
  parseValue: (value) => (typeof value === 'object' && value !== null ? value : null),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.OBJECT || ast.kind === Kind.LIST) {
      return valueFromASTUntyped(ast);
    }

    return null;
  }
});

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value) => new Date(value as string | number | Date).toISOString(),
  parseValue: (value) => (typeof value === 'string' ? value : null),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null)
});

export const resolvers: Resolvers<GraphQLContext> = {
  JSONObject: JSONObjectScalar,
  DateTime: DateTimeScalar,
  Query: {
    surahs: (_parent, args) => {
      const offset = args.offset ?? 0;
      const end = args.limit ? offset + args.limit : undefined;
      return surahs.slice(offset, end);
    },
    surah: (_parent, args) => findSurah(args.id),
    ayah: (_parent, args) => findAyah(args.surahId, args.ayahNumber)
  },
  Mutation: {
    getSignedUploadUrl: (_parent, { input }) => {
      const uploadKey = `${Date.now()}-${encodeURIComponent(input.filename)}`;
      const baseUrl = process.env.UPLOAD_BASE_URL ?? 'https://uploads.local';

      return {
        url: `${baseUrl}/${uploadKey}`,
        fields: {
          key: uploadKey,
          'Content-Type': input.contentType
        },
        expiresAt: secondsFromNow(900)
      };
    },
    createScoringJob: (_parent, { input }, context) => {
      const surah = findSurah(input.surahId);

      return {
        jobId: randomUUID(),
        uploadKey: input.uploadKey,
        status: 'COMPLETED',
        score: 0.92,
        verdict: 'Audio accepted for review',
        segments: [
          { label: 'tajweed', score: 0.88, metrics: { pace: 'steady' } },
          { label: 'pronunciation', score: 0.95 }
        ],
        createdAt: new Date().toISOString(),
        evaluation: {
          userId: context.session?.id ?? null,
          surah: surah?.nameEn,
          ayahNumber: input.ayahNumber ?? null,
          notes: input.transcript ? 'Transcript included' : 'Audio only'
        }
      };
    }
  },
  Surah: {
    ayahs: (parent, args) => {
      const offset = args.offset ?? 0;
      const end = args.limit ? offset + args.limit : undefined;
      return parent.ayahs.slice(offset, end);
    }
  }
};
