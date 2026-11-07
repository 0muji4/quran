import { GraphQLScalarType, Kind, valueFromASTUntyped, GraphQLError } from 'graphql';
import type { GraphQLContext, Resolvers } from '@quran-project/shared-ts';
import { fetchSurahsFromBackend, fetchSurahFromBackend, fetchAyahFromBackend } from '../infra';
import {
  createScoringJob,
  createSignedUploadUrl,
  getScoringJob,
  ScoringQuotaExceededError,
  UploadNotFoundError
} from '../jobs';
import { surahIdSchema, ayahNumberSchema } from '../validation/quranValidation';

const JSONObjectScalar = new GraphQLScalarType({
  name: 'JSONObject',
  coerceOutputValue: (value) => value ?? null,
  coerceInputValue: (value) => (typeof value === 'object' && value !== null ? value : null),
  coerceInputLiteral: (ast) => {
    if (ast.kind === Kind.OBJECT || ast.kind === Kind.LIST) {
      return valueFromASTUntyped(ast);
    }

    return null;
  }
});

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  coerceOutputValue: (value) => new Date(value as string | number | Date).toISOString(),
  coerceInputValue: (value) => (typeof value === 'string' ? value : null),
  coerceInputLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null)
});

const requireSession = (context: GraphQLContext): NonNullable<GraphQLContext['session']> => {
  if (!context.session) {
    throw new GraphQLError('authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.session;
};

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
    scoringJob: async (_parent, args, context) => {
      return getScoringJob(args.jobId, requireSession(context).id);
    }
  },
  Mutation: {
    getSignedUploadUrl: (_parent, { input }, context) =>
      createSignedUploadUrl({
        ...input,
        userId: requireSession(context).id
      }),
    createScoringJob: async (_parent, { input }, context) => {
      const session = requireSession(context);

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

      try {
        return await createScoringJob({
          uploadKey: input.uploadKey,
          surahId: input.surahId,
          ayahNumber: input.ayahNumber ?? null,
          userId: session.id
        });
      } catch (error) {
        if (error instanceof ScoringQuotaExceededError) {
          throw new GraphQLError(error.message, { extensions: { code: 'RATE_LIMITED' } });
        }
        if (error instanceof UploadNotFoundError) {
          throw new GraphQLError(error.message, { extensions: { code: 'NOT_FOUND' } });
        }
        throw error;
      }
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
