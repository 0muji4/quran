import { Suspense } from 'react';
import { fetchSuggestionFromBff, fetchSurahs } from '../actions';
import { LibraryClient } from './library/LibraryClient';
import { CompletionToast } from './library/CompletionToast';
import type { BffSuggestionResponse } from '../lib/classify';
import type { SurahSummary } from '../lib/types';

export default async function HomePage() {
  // The Library is unusable without a surah list, so on a fetch failure
  // we surface an explicit error state with a Retry control rather than
  // degrade to an empty grid that's indistinguishable from "your filter
  // matched nothing." The page still returns 200 — the failure is in
  // the body, not the response status — so e2e bring-up flows that
  // expect `/` to be reachable before migrations run keep working.
  let surahs: SurahSummary[] = [];
  let loadError = false;
  try {
    surahs = await fetchSurahs();
  } catch {
    loadError = true;
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
      <LibraryClient surahs={surahs} suggestion={suggestion} loadError={loadError} />
      {/* Suspense boundary required so useSearchParams in the toast doesn't
          opt the whole page into client-side rendering. */}
      <Suspense fallback={null}>
        <CompletionToast />
      </Suspense>
    </>
  );
}
