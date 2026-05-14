import { redirect } from 'next/navigation';

type SearchParams = {
  surah?: string;
  ayah?: string;
};

type RouteParams = {
  jobId: string;
};

// Backwards-compat shim for the old query-string format
// `/practice/result/<jobId>?surah=1&ayah=2`. Anything else (no
// surah/ayah hint) falls back to the library since we have no way to
// reconstruct the canonical path from a bare jobId without a BFF call.
export default async function LegacyResultRedirect({
  params,
  searchParams
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { jobId } = await params;
  const { surah, ayah } = await searchParams;
  const ayahNumber = Number(ayah ?? '');
  if (!surah || !Number.isFinite(ayahNumber) || ayahNumber <= 0) {
    redirect('/');
  }
  redirect(`/practice/${surah}/${ayahNumber}/result/${jobId}`);
}
