'use server';

import type { ScoringResult, SignedUploadUrl } from '@quran-project/shared-ts';
import 'server-only';

type SignedUploadResponse = SignedUploadUrl & { uploadKey?: string };

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? 'http://localhost:4000';

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const withNoStore: RequestInit = {
  cache: 'no-store',
  headers: jsonHeaders
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in (payload as Record<string, unknown>)
        ? (payload as Record<string, unknown>).error
        : response.statusText;
    throw new Error(typeof message === 'string' ? message : 'Request failed');
  }

  return payload as T;
};

export const requestSignedUploadUrl = async (input: {
  filename: string;
  contentType: string;
}): Promise<SignedUploadResponse> => {
  const response = await fetch(`${BFF_BASE_URL}/signed-upload-url`, {
    ...withNoStore,
    method: 'POST',
    body: JSON.stringify(input)
  });

  return parseJson<SignedUploadResponse>(response);
};

export const createScoringJobFromUpload = async (input: {
  uploadKey: string;
  surahId: string;
  ayahNumber?: number;
  transcript?: string;
}): Promise<ScoringResult> => {
  const response = await fetch(`${BFF_BASE_URL}/scoring-jobs`, {
    ...withNoStore,
    method: 'POST',
    body: JSON.stringify(input)
  });

  return parseJson<ScoringResult>(response);
};

export const fetchScoringJob = async (jobId: string): Promise<ScoringResult> => {
  const response = await fetch(`${BFF_BASE_URL}/scoring-jobs/${jobId}`, withNoStore);
  return parseJson<ScoringResult>(response);
};
