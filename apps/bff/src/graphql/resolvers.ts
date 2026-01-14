import { GraphQLScalarType, Kind, valueFromASTUntyped, GraphQLError } from 'graphql';
import type { GraphQLContext, Resolvers } from '@quran-project/shared-ts';
import { fetchSurahsFromBackend, fetchSurahFromBackend, fetchAyahFromBackend } from '../infra';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from '../jobs';
import { surahIdSchema, ayahNumberSchema } from '../validation/quranValidation';

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
    surahs: async (_parent, args) => {
      const allSurahs = await fetchSurahsFromBackend();
      const offset = args.offset ?? 0;
      const end = args.limit ? offset + args.limit : undefined;
      return allSurahs.slice(offset, end);
    },
    surah: async (_parent, args) => fetchSurahFromBackend(args.id),
    ayah: async (_parent, args) => fetchAyahFromBackend(args.surahId, args.ayahNumber),
    scoringJob: async (_parent, args) => getScoringJob(args.jobId)
  },
  Mutation: {
    getSignedUploadUrl: (_parent, { input }, context) =>
      createSignedUploadUrl({
        ...input,
        userId: context.session?.id ?? null
      }),
    createScoringJob: async (_parent, { input }, context) => {
      // Validate surahId
      const surahIdValidation = surahIdSchema.safeParse(input.surahId);
      if (!surahIdValidation.success) {
        throw new GraphQLError('Invalid surahId', {
          extensions: {
            code: 'BAD_USER_INPUT',
            issues: surahIdValidation.error.issues
          }
        });
      }

      // Validate ayahNumber if provided
      if (input.ayahNumber !== null && input.ayahNumber !== undefined) {
        const ayahNumberValidation = ayahNumberSchema.safeParse(input.ayahNumber);
        if (!ayahNumberValidation.success) {
          throw new GraphQLError('Invalid ayahNumber', {
            extensions: {
              code: 'BAD_USER_INPUT',
              issues: ayahNumberValidation.error.issues
            }
          });
        }
      }

      return createScoringJob({
        uploadKey: input.uploadKey,
        surahId: input.surahId,
        ayahNumber: input.ayahNumber ?? null,
        userId: context.session?.id ?? null
      });
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
