/**
 * gRPC client for the Go backend. Enabled by BACKEND_GRPC_ADDR; when unset,
 * callers fall back to the REST client.
 */

import {
  ChannelCredentials,
  Metadata,
  status,
  type CallOptions,
  type ClientUnaryCall,
  type ServiceError
} from '@grpc/grpc-js';
import { context, propagation, SpanKind } from '@opentelemetry/api';
import { ScoringStatus, type ScoringResult } from '@quran-project/shared-ts';
import {
  ScoringServiceClient,
  ScoringServiceService,
  ScoringStatus as ProtoScoringStatus,
  type ScoringJob
} from '../gen/quran/v1/scoring';
import {
  SurahServiceClient,
  SurahServiceService,
  type Ayah,
  type Surah
} from '../gen/quran/v1/surah';
import { telemetry } from '../telemetry/telemetry';
import { backendAuthorization } from './backendAuth';

const READ_DEADLINE_MS = 10_000;
// Exceeds the backend's 30s scoring.DefaultJobTimeout so its status arrives first.
const SCORING_DEADLINE_MS = 35_000;

const CHANNEL_OPTIONS = {
  'grpc.keepalive_time_ms': 60_000,
  'grpc.keepalive_timeout_ms': 10_000,
  'grpc.keepalive_permit_without_calls': 1
};

const SCORING_STATUSES = new Map<ProtoScoringStatus, ScoringStatus>([
  [ProtoScoringStatus.SCORING_STATUS_QUEUED, ScoringStatus.Queued],
  [ProtoScoringStatus.SCORING_STATUS_RUNNING, ScoringStatus.Running],
  [ProtoScoringStatus.SCORING_STATUS_COMPLETED, ScoringStatus.Completed],
  [ProtoScoringStatus.SCORING_STATUS_FAILED, ScoringStatus.Failed]
]);

type UnaryMethod<Request, Response> = (
  request: Request,
  metadata: Metadata,
  options: Partial<CallOptions>,
  callback: (error: ServiceError | null, response: Response) => void
) => ClientUnaryCall;

const callUnary = <Request, Response>(
  path: string,
  method: UnaryMethod<Request, Response>,
  request: Request,
  deadlineMs: number
): Promise<Response> =>
  telemetry.tracer.startActiveSpan(`gRPC ${path}`, { kind: SpanKind.CLIENT }, (span) => {
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);
    const metadata = new Metadata();
    Object.entries(carrier).forEach(([key, value]) => metadata.set(key, value));
    const authorization = backendAuthorization();
    if (authorization) metadata.set('authorization', authorization);

    span.setAttribute('rpc.system', 'grpc');
    span.setAttribute('rpc.method', path);

    return new Promise<Response>((resolve, reject) => {
      method(
        request,
        metadata,
        { deadline: new Date(Date.now() + deadlineMs) },
        (error, response) => {
          span.setAttribute('rpc.grpc.status_code', error?.code ?? status.OK);
          if (error) {
            span.recordException(error);
            reject(error);
            return;
          }
          resolve(response);
        }
      );
    }).finally(() => span.end());
  });

const nullIfNotFound = async <T>(call: Promise<T>): Promise<T | null> => {
  try {
    return await call;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === status.NOT_FOUND) {
      return null;
    }
    throw error;
  }
};

const toSurahId = (value: string): number => {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Invalid surah id: ${value}`);
  }
  return Number(value);
};

const toScoringResult = (job: ScoringJob | undefined): ScoringResult => {
  if (!job) {
    throw new Error('Backend returned no scoring job');
  }
  const scoringStatus = SCORING_STATUSES.get(job.status);
  if (!scoringStatus) {
    throw new Error(`Backend returned unknown scoring status: ${job.status}`);
  }
  return {
    jobId: job.sessionId,
    uploadKey: job.uploadKey,
    status: scoringStatus,
    score: job.score ?? null,
    verdict: job.verdict ?? null,
    segments: job.segments ?? [],
    evaluation: job.evaluation ?? null,
    createdAt: job.createTime?.toISOString() ?? ''
  };
};

export interface CreateScoringJobInput {
  sessionId: string;
  uploadKey: string;
  surahId: string;
  ayahNumber: number | null;
  userId: string | null;
  referenceAudioKey: string | null;
}

export interface BackendGrpc {
  listSurahs(): Promise<Surah[]>;
  getSurah(surahId: string): Promise<Surah | null>;
  listAyahs(surahId: string): Promise<Ayah[]>;
  getAyah(surahId: string, ayahNumber: number): Promise<Ayah | null>;
  createScoringJob(input: CreateScoringJobInput): Promise<ScoringResult>;
  getScoringJob(sessionId: string): Promise<ScoringResult | null>;
  close(): void;
}

const createBackendGrpc = (address: string, useTls: boolean): BackendGrpc => {
  const credentials = useTls ? ChannelCredentials.createSsl() : ChannelCredentials.createInsecure();
  const surahs = new SurahServiceClient(address, credentials, CHANNEL_OPTIONS);
  const scoring = new ScoringServiceClient(address, credentials, CHANNEL_OPTIONS);

  return {
    listSurahs: async () => {
      const response = await callUnary(
        SurahServiceService.listSurahs.path,
        surahs.listSurahs.bind(surahs),
        {},
        READ_DEADLINE_MS
      );
      return response.surahs;
    },

    getSurah: async (surahId) => {
      const response = await nullIfNotFound(
        callUnary(
          SurahServiceService.getSurah.path,
          surahs.getSurah.bind(surahs),
          { surahId: toSurahId(surahId) },
          READ_DEADLINE_MS
        )
      );
      return response?.surah ?? null;
    },

    listAyahs: async (surahId) => {
      const response = await callUnary(
        SurahServiceService.listAyahs.path,
        surahs.listAyahs.bind(surahs),
        { surahId: toSurahId(surahId) },
        READ_DEADLINE_MS
      );
      return response.ayahs;
    },

    getAyah: async (surahId, ayahNumber) => {
      const response = await nullIfNotFound(
        callUnary(
          SurahServiceService.getAyah.path,
          surahs.getAyah.bind(surahs),
          { surahId: toSurahId(surahId), ayahNumber },
          READ_DEADLINE_MS
        )
      );
      return response?.ayah ?? null;
    },

    createScoringJob: async (input) => {
      const response = await callUnary(
        ScoringServiceService.createScoringJob.path,
        scoring.createScoringJob.bind(scoring),
        {
          sessionId: input.sessionId,
          uploadKey: input.uploadKey,
          surahId: toSurahId(input.surahId),
          ayahNumber: input.ayahNumber ?? 0,
          userId: input.userId ?? '',
          referenceAudioKey: input.referenceAudioKey ?? ''
        },
        SCORING_DEADLINE_MS
      );
      return toScoringResult(response.job);
    },

    getScoringJob: async (sessionId) => {
      const response = await nullIfNotFound(
        callUnary(
          ScoringServiceService.getScoringJob.path,
          scoring.getScoringJob.bind(scoring),
          { sessionId },
          READ_DEADLINE_MS
        )
      );
      return response && toScoringResult(response.job);
    },

    close: () => {
      surahs.close();
      scoring.close();
    }
  };
};

let cached: BackendGrpc | null = null;

export const getBackendGrpc = (): BackendGrpc | null => {
  if (cached) return cached;
  const address = process.env.BACKEND_GRPC_ADDR;
  if (!address) return null;
  cached = createBackendGrpc(address, process.env.BACKEND_GRPC_TLS?.toLowerCase() !== 'false');
  return cached;
};

// Closes the cached client so the next getBackendGrpc() call rebuilds it.
export const resetBackendGrpc = (): void => {
  cached?.close();
  cached = null;
};
