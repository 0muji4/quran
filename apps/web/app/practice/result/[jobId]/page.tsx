import { notFound, redirect } from 'next/navigation';
import { fetchScoringJob, fetchSurahAyahs, fetchSurahs } from '../../../actions';
import type { AyahRecord, SurahSummary } from '../../../lib/types';
import { ResultDetail } from '../ResultDetail';
import { ResultError } from '../ResultError';
import { ResultPolling } from '../ResultPolling';

type SearchParams = {
  surah?: string;
  ayah?: string;
};

type RouteParams = {
  jobId: string;
};

export default async function PracticeResultPage({
  params,
  searchParams
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { jobId } = await params;
  const search = await searchParams;
  const surahId = search.surah;
  const ayahNumberRaw = Number(search.ayah ?? '');

  if (!surahId || !Number.isFinite(ayahNumberRaw) || ayahNumberRaw <= 0) {
    redirect('/');
  }

  let job: Awaited<ReturnType<typeof fetchScoringJob>>;
  let surahs: SurahSummary[];
  let ayahs: AyahRecord[];
  try {
    [job, surahs, ayahs] = await Promise.all([
      fetchScoringJob(jobId),
      fetchSurahs(),
      fetchSurahAyahs(surahId)
    ]);
  } catch {
    notFound();
  }

  const surah = surahs.find((s) => s.id === surahId);
  const ayah = ayahs.find((a) => a.ayahNumber === ayahNumberRaw);
  if (!surah || !ayah) notFound();

  if (job.status === 'COMPLETED') {
    return <ResultDetail job={job} surah={surah} ayah={ayah} totalAyahs={ayahs.length} />;
  }

  if (job.status === 'FAILED') {
    return (
      <ResultError
        surah={surah}
        ayah={ayah}
        message={job.verdict ?? 'Scoring failed. Please try again.'}
      />
    );
  }

  return <ResultPolling initialJob={job} surah={surah} ayah={ayah} totalAyahs={ayahs.length} />;
}
