import { notFound, redirect } from 'next/navigation';
import {
  fetchReferenceAudioUrl,
  fetchScoringJob,
  fetchSurahAyahs,
  fetchSurahs
} from '../../../actions';
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

  // Teacher reference audio is served by a separate BFF endpoint; fetch
  // alongside the rest so the result page can render the Listen back tile
  // server-side. Failures here are non-fatal — we hide the player gracefully.
  let teacherAudioUrl: string | null = null;
  try {
    const ref = await fetchReferenceAudioUrl(Number(surah.id), ayah.ayahNumber);
    teacherAudioUrl = ref.url;
  } catch {
    teacherAudioUrl = null;
  }

  if (job.status === 'COMPLETED') {
    return (
      <ResultDetail
        job={job}
        surah={surah}
        ayah={ayah}
        totalAyahs={ayahs.length}
        teacherAudioUrl={teacherAudioUrl}
      />
    );
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

  return (
    <ResultPolling
      initialJob={job}
      surah={surah}
      ayah={ayah}
      totalAyahs={ayahs.length}
      teacherAudioUrl={teacherAudioUrl}
    />
  );
}
