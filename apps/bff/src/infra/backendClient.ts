/**
 * Client for calling the backend Go API
 */

import { context, propagation } from '@opentelemetry/api';
import { telemetry } from '../telemetry/telemetry';

const tracer = telemetry.tracer;

type BackendSurah = {
  id: number;
  name_ar: string;
  name_en: string;
  revelation_place: string;
  ayah_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type BackendAyah = {
  id: number;
  surah_id: number;
  ayah_number: number;
  text_ar: string;
  text_en?: string;
  transliteration?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

/**
 * Helper function to create fetch with trace context propagation
 */
export const fetchWithTracing = async (
  url: string,
  options?: Parameters<typeof fetch>[1]
): Promise<Response> => {
  return tracer.startActiveSpan(`HTTP ${options?.method ?? 'GET'} ${url}`, async (span) => {
    try {
      // Inject trace context into request headers
      const headers: Record<string, string> = {};
      propagation.inject(context.active(), headers);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          ...headers
        }
      });

      // Set span attributes
      span.setAttribute('http.method', options?.method ?? 'GET');
      span.setAttribute('http.url', url);
      span.setAttribute('http.status_code', response.status);

      if (!response.ok) {
        span.recordException(new Error(`HTTP ${response.status}: ${response.statusText}`));
      }

      return response;
    } finally {
      span.end();
    }
  });
};

export type SurahRecord = {
  id: string;
  nameAr: string;
  nameEn: string;
  revelationPlace: string;
  ayahCount: number;
  metadata?: Record<string, unknown>;
  ayahs: AyahRecord[];
};

export type AyahRecord = {
  id: string;
  surahId: string;
  ayahNumber: number;
  textAr: string;
  textEn?: string;
  transliteration?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Fetch all surahs from the backend API
 */
export const fetchSurahsFromBackend = async (): Promise<SurahRecord[]> => {
  const response = await fetchWithTracing(`${BACKEND_URL}/api/surahs`);

  if (!response.ok) {
    throw new Error(`Failed to fetch surahs: ${response.statusText}`);
  }

  const backendSurahs = (await response.json()) as BackendSurah[];

  // Transform backend format to BFF format
  return backendSurahs.map((surah) => ({
    id: String(surah.id),
    nameAr: surah.name_ar,
    nameEn: surah.name_en,
    revelationPlace: surah.revelation_place,
    ayahCount: surah.ayah_count,
    metadata: surah.metadata,
    ayahs: [] // Will be populated when needed
  }));
};

/**
 * Fetch a specific surah by ID from the backend API
 */
export const fetchSurahFromBackend = async (surahId: string): Promise<SurahRecord | null> => {
  const response = await fetchWithTracing(`${BACKEND_URL}/api/surahs/${surahId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch surah ${surahId}: ${response.statusText}`);
  }

  const surah = (await response.json()) as BackendSurah;

  // Fetch ayahs for this surah
  const ayahsResponse = await fetchWithTracing(`${BACKEND_URL}/api/surahs/${surahId}/ayahs`);
  let ayahs: AyahRecord[] = [];

  if (ayahsResponse.ok) {
    const backendAyahs = (await ayahsResponse.json()) as BackendAyah[];
    ayahs = backendAyahs.map((ayah) => ({
      id: `${ayah.surah_id}:${ayah.ayah_number}`,
      surahId: String(ayah.surah_id),
      ayahNumber: ayah.ayah_number,
      textAr: ayah.text_ar,
      textEn: ayah.text_en,
      transliteration: ayah.transliteration,
      metadata: ayah.metadata
    }));
  }

  return {
    id: String(surah.id),
    nameAr: surah.name_ar,
    nameEn: surah.name_en,
    revelationPlace: surah.revelation_place,
    ayahCount: surah.ayah_count,
    metadata: surah.metadata,
    ayahs
  };
};

/**
 * Fetch ayahs for a specific surah from the backend API
 */
export const fetchAyahsFromBackend = async (surahId: string): Promise<AyahRecord[]> => {
  const response = await fetchWithTracing(`${BACKEND_URL}/api/surahs/${surahId}/ayahs`);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ayahs for surah ${surahId}: ${response.statusText}`);
  }

  const backendAyahs = (await response.json()) as BackendAyah[];

  return backendAyahs.map((ayah) => ({
    id: `${ayah.surah_id}:${ayah.ayah_number}`,
    surahId: String(ayah.surah_id),
    ayahNumber: ayah.ayah_number,
    textAr: ayah.text_ar,
    textEn: ayah.text_en,
    transliteration: ayah.transliteration,
    metadata: ayah.metadata
  }));
};

/**
 * Find a specific ayah by surah ID and ayah number
 */
export const fetchAyahFromBackend = async (
  surahId: string,
  ayahNumber: number
): Promise<AyahRecord | null> => {
  const ayahs = await fetchAyahsFromBackend(surahId);
  return ayahs.find((ayah) => ayah.ayahNumber === ayahNumber) ?? null;
};
