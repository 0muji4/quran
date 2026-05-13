import { Suspense } from 'react';
import { fetchSuggestionFromBff, fetchSurahs } from './actions';
import { LibraryClient } from './library/LibraryClient';
import { CompletionToast } from './library/CompletionToast';
import type { BffSuggestionResponse } from './lib/classify';
import type { SurahSummary } from './lib/types';

export default async function HomePage() {
  // The BFF or DB may not yet be ready (e.g. during e2e bring-up before
  // migrations run). Degrade gracefully to an empty list so `/` still
  // returns 200 — the client-rendered LibraryClient handles the empty
  // state and a refresh will pick up surahs once the BFF is healthy.
  let surahs: SurahSummary[] = [];
  try {
    surahs = await fetchSurahs();
  } catch {
    surahs = [];
  }

  // Suggestion + difficulties are personalised per user. The action
  // already swallows 401 / network errors and returns null, so the
  // client falls back to the ayahCount heuristic without any extra
  // guard here.
  let suggestion: BffSuggestionResponse | null = null;
  try {
    suggestion = await fetchSuggestionFromBff();
  } catch {
    suggestion = null;
  }

  return (
    <>
      <LibraryClient surahs={surahs} suggestion={suggestion} />
      {/* Suspense boundary required so useSearchParams in the toast doesn't
          opt the whole page into client-side rendering. */}
      <Suspense fallback={null}>
        <CompletionToast />
      </Suspense>
    </>
  );
}
