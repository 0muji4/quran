import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown> };
}

export interface Ayah {
  __typename?: 'Ayah';
  ayahNumber: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSONObject']['output']>;
  surahId: Scalars['ID']['output'];
  textAr: Scalars['String']['output'];
  textEn: Maybe<Scalars['String']['output']>;
  transliteration: Maybe<Scalars['String']['output']>;
}

export interface CreateScoringJobInput {
  ayahNumber: InputMaybe<Scalars['Int']['input']>;
  surahId: Scalars['ID']['input'];
  uploadKey: Scalars['String']['input'];
}

export interface Mutation {
  __typename?: 'Mutation';
  createScoringJob: ScoringResult;
  getSignedUploadUrl: SignedUploadUrl;
}

export interface MutationCreateScoringJobArgs {
  input: CreateScoringJobInput;
}

export interface MutationGetSignedUploadUrlArgs {
  input: SignedUploadInput;
}

export interface PronunciationFeedback {
  __typename?: 'PronunciationFeedback';
  accuracy: Scalars['Float']['output'];
  completeness: Scalars['Float']['output'];
  fluency: Scalars['Float']['output'];
  overall: Scalars['Float']['output'];
  referenceAudioUrl: Maybe<Scalars['String']['output']>;
  transcript: Maybe<Scalars['String']['output']>;
  wer: Maybe<Scalars['Float']['output']>;
  wordAlignments: Array<WordAlignment>;
}

export interface Query {
  __typename?: 'Query';
  ayah: Maybe<Ayah>;
  scoringJob: Maybe<ScoringResult>;
  surah: Maybe<Surah>;
  surahs: Array<Surah>;
}

export interface QueryAyahArgs {
  ayahNumber: Scalars['Int']['input'];
  surahId: Scalars['ID']['input'];
}

export interface QueryScoringJobArgs {
  jobId: Scalars['ID']['input'];
}

export interface QuerySurahArgs {
  id: Scalars['ID']['input'];
}

export interface QuerySurahsArgs {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
}

export interface ScoreSegment {
  __typename?: 'ScoreSegment';
  label: Scalars['String']['output'];
  metrics: Maybe<Scalars['JSONObject']['output']>;
  score: Scalars['Float']['output'];
}

export interface ScoringResult {
  __typename?: 'ScoringResult';
  createdAt: Scalars['DateTime']['output'];
  evaluation: Maybe<Scalars['JSONObject']['output']>;
  feedback: Maybe<PronunciationFeedback>;
  jobId: Scalars['ID']['output'];
  recordingUrl: Maybe<Scalars['String']['output']>;
  score: Maybe<Scalars['Float']['output']>;
  segments: Array<ScoreSegment>;
  status: ScoringStatus;
  uploadKey: Scalars['String']['output'];
  verdict: Maybe<Scalars['String']['output']>;
}

export enum ScoringStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export interface SignedUploadInput {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
}

export interface SignedUploadUrl {
  __typename?: 'SignedUploadUrl';
  expiresAt: Scalars['DateTime']['output'];
  fields: Maybe<Scalars['JSONObject']['output']>;
  url: Scalars['String']['output'];
}

export interface Surah {
  __typename?: 'Surah';
  ayahCount: Scalars['Int']['output'];
  ayahs: Array<Ayah>;
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSONObject']['output']>;
  nameAr: Scalars['String']['output'];
  nameEn: Scalars['String']['output'];
  revelationPlace: Scalars['String']['output'];
}

export interface SurahAyahsArgs {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
}

export interface WordAlignment {
  __typename?: 'WordAlignment';
  hypWord: Maybe<Scalars['String']['output']>;
  op: Scalars['String']['output'];
  refWord: Maybe<Scalars['String']['output']>;
}

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {}
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Ayah: ResolverTypeWrapper<Ayah>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateScoringJobInput: CreateScoringJobInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  PronunciationFeedback: ResolverTypeWrapper<PronunciationFeedback>;
  Query: ResolverTypeWrapper<{}>;
  ScoreSegment: ResolverTypeWrapper<ScoreSegment>;
  ScoringResult: ResolverTypeWrapper<ScoringResult>;
  ScoringStatus: ScoringStatus;
  SignedUploadInput: SignedUploadInput;
  SignedUploadUrl: ResolverTypeWrapper<SignedUploadUrl>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Surah: ResolverTypeWrapper<Surah>;
  WordAlignment: ResolverTypeWrapper<WordAlignment>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Ayah: Ayah;
  Boolean: Scalars['Boolean']['output'];
  CreateScoringJobInput: CreateScoringJobInput;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  Mutation: {};
  PronunciationFeedback: PronunciationFeedback;
  Query: {};
  ScoreSegment: ScoreSegment;
  ScoringResult: ScoringResult;
  SignedUploadInput: SignedUploadInput;
  SignedUploadUrl: SignedUploadUrl;
  String: Scalars['String']['output'];
  Surah: Surah;
  WordAlignment: WordAlignment;
};

export type AyahResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Ayah'] = ResolversParentTypes['Ayah']
> = {
  ayahNumber: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  surahId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  textAr: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textEn: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  transliteration: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['DateTime'],
  any
> {
  name: 'DateTime';
}

export interface JsonObjectScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['JSONObject'],
  any
> {
  name: 'JSONObject';
}

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']
> = {
  createScoringJob: Resolver<
    ResolversTypes['ScoringResult'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateScoringJobArgs, 'input'>
  >;
  getSignedUploadUrl: Resolver<
    ResolversTypes['SignedUploadUrl'],
    ParentType,
    ContextType,
    RequireFields<MutationGetSignedUploadUrlArgs, 'input'>
  >;
};

export type PronunciationFeedbackResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['PronunciationFeedback'] =
    ResolversParentTypes['PronunciationFeedback']
> = {
  accuracy: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  completeness: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  fluency: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overall: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  referenceAudioUrl: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  transcript: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  wer: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  wordAlignments: Resolver<Array<ResolversTypes['WordAlignment']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  ayah: Resolver<
    Maybe<ResolversTypes['Ayah']>,
    ParentType,
    ContextType,
    RequireFields<QueryAyahArgs, 'ayahNumber' | 'surahId'>
  >;
  scoringJob: Resolver<
    Maybe<ResolversTypes['ScoringResult']>,
    ParentType,
    ContextType,
    RequireFields<QueryScoringJobArgs, 'jobId'>
  >;
  surah: Resolver<
    Maybe<ResolversTypes['Surah']>,
    ParentType,
    ContextType,
    RequireFields<QuerySurahArgs, 'id'>
  >;
  surahs: Resolver<Array<ResolversTypes['Surah']>, ParentType, ContextType, QuerySurahsArgs>;
};

export type ScoreSegmentResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['ScoreSegment'] = ResolversParentTypes['ScoreSegment']
> = {
  label: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  score: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ScoringResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['ScoringResult'] = ResolversParentTypes['ScoringResult']
> = {
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  evaluation: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  feedback: Resolver<Maybe<ResolversTypes['PronunciationFeedback']>, ParentType, ContextType>;
  jobId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recordingUrl: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  score: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  segments: Resolver<Array<ResolversTypes['ScoreSegment']>, ParentType, ContextType>;
  status: Resolver<ResolversTypes['ScoringStatus'], ParentType, ContextType>;
  uploadKey: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verdict: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignedUploadUrlResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['SignedUploadUrl'] =
    ResolversParentTypes['SignedUploadUrl']
> = {
  expiresAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fields: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  url: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SurahResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Surah'] = ResolversParentTypes['Surah']
> = {
  ayahCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ayahs: Resolver<Array<ResolversTypes['Ayah']>, ParentType, ContextType, SurahAyahsArgs>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  nameAr: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameEn: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revelationPlace: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WordAlignmentResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['WordAlignment'] = ResolversParentTypes['WordAlignment']
> = {
  hypWord: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  op: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refWord: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Ayah: AyahResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  JSONObject: GraphQLScalarType;
  Mutation: MutationResolvers<ContextType>;
  PronunciationFeedback: PronunciationFeedbackResolvers<ContextType>;
  Query: QueryResolvers<ContextType>;
  ScoreSegment: ScoreSegmentResolvers<ContextType>;
  ScoringResult: ScoringResultResolvers<ContextType>;
  SignedUploadUrl: SignedUploadUrlResolvers<ContextType>;
  Surah: SurahResolvers<ContextType>;
  WordAlignment: WordAlignmentResolvers<ContextType>;
};
