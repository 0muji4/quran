import { Router } from 'express';
import type { ScoringResult } from '@quran-project/shared-ts';
import type { AuthedRequest } from './auth';
import { createScoringJob, createSignedUploadUrl, getScoringJob } from './scoringJobs';

type SignedUploadResponse = ReturnType<typeof createSignedUploadUrl>;

type JobResponse = ScoringResult;

export const restRouter = Router();

restRouter.post('/signed-upload-url', (req: AuthedRequest, res) => {
  const { filename, contentType } = req.body ?? {};

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  const response: SignedUploadResponse = createSignedUploadUrl({ filename, contentType });
  res.json(response);
});

restRouter.post('/scoring-jobs', (req: AuthedRequest, res) => {
  const { uploadKey, surahId, ayahNumber, transcript } = req.body ?? {};

  if (!uploadKey || !surahId) {
    res.status(400).json({ error: 'uploadKey and surahId are required' });
    return;
  }

  const job: JobResponse = createScoringJob({
    uploadKey,
    surahId,
    ayahNumber: typeof ayahNumber === 'number' ? ayahNumber : null,
    transcript,
    userId: req.session?.id ?? null
  });

  res.status(201).json(job);
});

restRouter.get('/scoring-jobs/:jobId', (req: AuthedRequest, res) => {
  const job = getScoringJob(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});
