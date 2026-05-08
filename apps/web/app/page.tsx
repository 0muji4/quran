import { Suspense } from 'react';
import { fetchSurahs } from './actions';
import { LibraryClient } from './library/LibraryClient';
import { CompletionToast } from './library/CompletionToast';
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
  return (
    <>
      <LibraryClient surahs={surahs} />
      {/* Suspense boundary required so useSearchParams in the toast doesn't
          opt the whole page into client-side rendering. */}
      <Suspense fallback={null}>
        <CompletionToast />
      </Suspense>
    </>
  );
}
