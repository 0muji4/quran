import { GraphQLScalarType, Kind, valueFromASTUntyped } from 'graphql';
import type { GraphQLContext, Resolvers } from '@quran-project/shared-ts';
import { findAyah, findSurah, surahs } from './data';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from './scoringJobs';

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
    ayah: (_parent, args) => findAyah(args.surahId, args.ayahNumber),
    scoringJob: (_parent, args) => getScoringJob(args.jobId)
  },
  Mutation: {
    getSignedUploadUrl: (_parent, { input }) => createSignedUploadUrl(input),
    createScoringJob: (_parent, { input }, context) =>
      createScoringJob({
        uploadKey: input.uploadKey,
        surahId: input.surahId,
        ayahNumber: input.ayahNumber ?? null,
        transcript: input.transcript ?? null,
        userId: context.session?.id ?? null
      })
  },
  Surah: {
    ayahs: (parent, args) => {
      const offset = args.offset ?? 0;
      const end = args.limit ? offset + args.limit : undefined;
      return parent.ayahs.slice(offset, end);
    }
  }
};
