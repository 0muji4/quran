import { redirect } from 'next/navigation';

// Pre-Tilawah-redesign legacy. Now that /practice is path-based and bare
// /practice has no canonical landing page, jump straight to the default
// surah/ayah so old bookmarks land on a usable page instead of a redirect
// loop back to the library.
export default function RecordPage() {
  redirect('/practice/1/1');
}
