import { fetchSurahs } from './actions';
import { LibraryClient } from './library/LibraryClient';

export default async function HomePage() {
  const surahs = await fetchSurahs();
  return <LibraryClient surahs={surahs} />;
}
