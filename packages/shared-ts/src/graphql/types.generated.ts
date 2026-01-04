import type {
  GraphQLEnumType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig
} from 'graphql';
import type { GraphQLContext } from '../types';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends '$fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values. */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: string;
  JSONObject: Record<string, unknown>;
};

export type Ayah = {
  __typename?: 'Ayah';
  ayahNumber: Scalars['Int'];
  id: Scalars['ID'];
  metadata?: Maybe<Scalars['JSONObject']>;
  surahId: Scalars['ID'];
  textAr: Scalars['String'];
  textEn?: Maybe<Scalars['String']>;
  transliteration?: Maybe<Scalars['String']>;
};

export type CreateScoringJobInput = {
  ayahNumber?: InputMaybe<Scalars['Int']>;
  surahId: Scalars['ID'];
  uploadKey: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createScoringJob: ScoringResult;
  getSignedUploadUrl: SignedUploadUrl;
};

export type MutationCreateScoringJobArgs = {
  input: CreateScoringJobInput;
};

export type MutationGetSignedUploadUrlArgs = {
  input: SignedUploadInput;
};

export type Query = {
  __typename?: 'Query';
  ayah?: Maybe<Ayah>;
  scoringJob?: Maybe<ScoringResult>;
  surah?: Maybe<Surah>;
  surahs: Array<Surah>;
};

export type QueryAyahArgs = {
  ayahNumber: Scalars['Int'];
  surahId: Scalars['ID'];
};

export type QuerySurahArgs = {
  id: Scalars['ID'];
};

export type QueryScoringJobArgs = {
  jobId: Scalars['ID'];
};

export type QuerySurahsArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

export type ScoreSegment = {
  __typename?: 'ScoreSegment';
  label: Scalars['String'];
  metrics?: Maybe<Scalars['JSONObject']>;
  score: Scalars['Float'];
};

export type WordAlignment = {
  __typename?: 'WordAlignment';
  hypWord?: Maybe<Scalars['String']>;
  op: Scalars['String'];
  refWord?: Maybe<Scalars['String']>;
};

export type PronunciationFeedback = {
  __typename?: 'PronunciationFeedback';
  accuracy: Scalars['Float'];
  completeness: Scalars['Float'];
  fluency: Scalars['Float'];
  overall: Scalars['Float'];
  referenceAudioUrl?: Maybe<Scalars['String']>;
  wordAlignments: Array<WordAlignment>;
  transcript?: Maybe<Scalars['String']>;
  wer?: Maybe<Scalars['Float']>;
};

export type ScoringResult = {
  __typename?: 'ScoringResult';
  createdAt: Scalars['DateTime'];
  evaluation?: Maybe<Scalars['JSONObject']>;
  feedback?: Maybe<PronunciationFeedback>;
  jobId: Scalars['ID'];
  score?: Maybe<Scalars['Float']>;
  segments: Array<ScoreSegment>;
  status: ScoringStatus;
  uploadKey: Scalars['String'];
  verdict?: Maybe<Scalars['String']>;
};

export enum ScoringStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export type SignedUploadInput = {
  contentType: Scalars['String'];
  filename: Scalars['String'];
};

export type SignedUploadUrl = {
  __typename?: 'SignedUploadUrl';
  expiresAt: Scalars['DateTime'];
  fields?: Maybe<Scalars['JSONObject']>;
  url: Scalars['String'];
};

export type Surah = {
  __typename?: 'Surah';
  ayahCount: Scalars['Int'];
  ayahs: Array<Ayah>;
  id: Scalars['ID'];
  metadata?: Maybe<Scalars['JSONObject']>;
  nameAr: Scalars['String'];
  nameEn: Scalars['String'];
  revelationPlace: Scalars['String'];
};

export type SurahAyahsArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

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
> = (...args: any) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

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

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: () => Promise<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Ayah: ResolverTypeWrapper<Ayah>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  CreateScoringJobInput: CreateScoringJobInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']>;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']>;
  Mutation: ResolverTypeWrapper<{}>;
  PronunciationFeedback: ResolverTypeWrapper<PronunciationFeedback>;
  Query: ResolverTypeWrapper<{}>;
  ScoreSegment: ResolverTypeWrapper<ScoreSegment>;
  ScoringResult: ResolverTypeWrapper<ScoringResult>;
  ScoringStatus: ResolverTypeWrapper<ScoringStatus>;
  SignedUploadInput: SignedUploadInput;
  SignedUploadUrl: ResolverTypeWrapper<SignedUploadUrl>;
  String: ResolverTypeWrapper<Scalars['String']>;
  Surah: ResolverTypeWrapper<Surah>;
  WordAlignment: ResolverTypeWrapper<WordAlignment>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Ayah: Ayah;
  Boolean: Scalars['Boolean'];
  CreateScoringJobInput: CreateScoringJobInput;
  DateTime: Scalars['DateTime'];
  Float: Scalars['Float'];
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  JSONObject: Scalars['JSONObject'];
  Mutation: {};
  PronunciationFeedback: PronunciationFeedback;
  Query: {};
  ScoreSegment: ScoreSegment;
  ScoringResult: ScoringResult;
  ScoringStatus: ScoringStatus;
  SignedUploadInput: SignedUploadInput;
  SignedUploadUrl: SignedUploadUrl;
  String: Scalars['String'];
  Surah: Surah;
  WordAlignment: WordAlignment;
};

export type AyahResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Ayah'] = ResolversParentTypes['Ayah']
> = {
  ayahNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  surahId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  textAr?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  textEn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  transliteration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['DateTime'],
  any
> {
  name: 'DateTime';
}

export interface JSONObjectScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['JSONObject'],
  any
> {
  name: 'JSONObject';
}

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']
> = {
  createScoringJob?: Resolver<
    ResolversTypes['ScoringResult'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateScoringJobArgs, 'input'>
  >;
  getSignedUploadUrl?: Resolver<
    ResolversTypes['SignedUploadUrl'],
    ParentType,
    ContextType,
    RequireFields<MutationGetSignedUploadUrlArgs, 'input'>
  >;
};

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  ayah?: Resolver<
    Maybe<ResolversTypes['Ayah']>,
    ParentType,
    ContextType,
    RequireFields<QueryAyahArgs, 'ayahNumber' | 'surahId'>
  >;
  scoringJob?: Resolver<
    Maybe<ResolversTypes['ScoringResult']>,
    ParentType,
    ContextType,
    RequireFields<QueryScoringJobArgs, 'jobId'>
  >;
  surah?: Resolver<
    Maybe<ResolversTypes['Surah']>,
    ParentType,
    ContextType,
    RequireFields<QuerySurahArgs, 'id'>
  >;
  surahs?: Resolver<
    Array<ResolversTypes['Surah']>,
    ParentType,
    ContextType,
    Partial<QuerySurahsArgs>
  >;
};

export type ScoreSegmentResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['ScoreSegment'] = ResolversParentTypes['ScoreSegment']
> = {
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ScoringResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['ScoringResult'] = ResolversParentTypes['ScoringResult']
> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  evaluation?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  feedback?: Resolver<Maybe<ResolversTypes['PronunciationFeedback']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['ScoreSegment']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ScoringStatus'], ParentType, ContextType>;
  uploadKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verdict?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PronunciationFeedbackResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['PronunciationFeedback'] =
    ResolversParentTypes['PronunciationFeedback']
> = {
  accuracy?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  completeness?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  fluency?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overall?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  referenceAudioUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  wordAlignments?: Resolver<Array<ResolversTypes['WordAlignment']>, ParentType, ContextType>;
  transcript?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  wer?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WordAlignmentResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['WordAlignment'] = ResolversParentTypes['WordAlignment']
> = {
  hypWord?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  op?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refWord?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SignedUploadUrlResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['SignedUploadUrl'] =
    ResolversParentTypes['SignedUploadUrl']
> = {
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fields?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SurahResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Surah'] = ResolversParentTypes['Surah']
> = {
  ayahCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ayahs?: Resolver<Array<ResolversTypes['Ayah']>, ParentType, ContextType, Partial<SurahAyahsArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSONObject']>, ParentType, ContextType>;
  nameAr?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameEn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revelationPlace?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Ayah?: AyahResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  JSONObject?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  PronunciationFeedback?: PronunciationFeedbackResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ScoreSegment?: ScoreSegmentResolvers<ContextType>;
  ScoringResult?: ScoringResultResolvers<ContextType>;
  ScoringStatus?: GraphQLEnumType;
  SignedUploadUrl?: SignedUploadUrlResolvers<ContextType>;
  Surah?: SurahResolvers<ContextType>;
  WordAlignment?: WordAlignmentResolvers<ContextType>;
};
