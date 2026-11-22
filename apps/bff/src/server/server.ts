import '../telemetry/index.js';
import { logger } from '../telemetry/index.js';
import { ensureBucketPolicy } from '../infra/index.js';
import { startSoftDeletePurger } from '../auth/purge-job.js';
import { createApp } from './app.js';

void ensureBucketPolicy().catch((error) => {
  logger.error('failed to ensure bucket policy', { error: error.message });
});

const app = createApp();
const port = Number(process.env.PORT ?? 4000);

logger.info('Starting BFF service');

// ADR-0024 §5: hard-delete soft-deleted users past the grace
// window. Runs on startup + every 24h. `.unref()`-ed inside the
// helper so the timer never holds the process open during tests.
startSoftDeletePurger();

app.listen(port, () => {
  logger.info('BFF listening', { port, url: `http://localhost:${port}` });
});
