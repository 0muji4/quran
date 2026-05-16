import { getLocale } from 'next-intl/server';
import { redirect } from '../../../../i18n/navigation';

// Pre-Tilawah-redesign legacy. Now that /practice is path-based and bare
// /practice has no canonical landing page, jump straight to the default
// surah/ayah so old bookmarks land on a usable page instead of a redirect
// loop back to the library.
export default async function RecordPage() {
  const locale = await getLocale();
  redirect({ href: '/practice/1/1', locale });
}
