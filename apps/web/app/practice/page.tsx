import { redirect } from 'next/navigation';

type SearchParams = {
  surah?: string;
  ayah?: string;
};

// Backwards-compat shim. Old links / bookmarks of the form
// `/practice?surah=1&ayah=2` are 308-redirected to the canonical
// `/practice/1/2` path. Bare `/practice` falls back to the library.
export default async function LegacyPracticeRedirect({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { surah, ayah } = await searchParams;
  const ayahNumber = Number(ayah ?? '1');
  if (!surah || !Number.isFinite(ayahNumber) || ayahNumber <= 0) {
    redirect('/');
  }
  redirect(`/practice/${surah}/${ayahNumber}`);
}
