import { getLocale } from 'next-intl/server';
import { redirect } from '../../../../i18n/navigation';

interface SearchParams {
  surah?: string;
  ayah?: string;
}

// Backwards-compat shim. Old links / bookmarks of the form
// `/practice?surah=1&ayah=2` are 308-redirected to the canonical
// `/practice/1/2`. Bare `/practice` falls back to Al-Fatihah 1:1 to
// match the iOS Practice tab default (AppRoot.swift PracticeContext).
// TopNav's smart link normally bypasses this route for signed-in
// users with a LastPracticed entry; this fallback exists for no-JS,
// SSR pre-hydration, and legacy bookmark access.
export default async function LegacyPracticeRedirect({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getLocale();
  const { surah, ayah } = await searchParams;
  const ayahNumber = Number(ayah ?? '1');
  if (!surah || !Number.isFinite(ayahNumber) || ayahNumber <= 0) {
    redirect({ href: '/practice/1/1', locale });
  }
  redirect({ href: `/practice/${surah}/${ayahNumber}`, locale });
}
