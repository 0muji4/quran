import '../telemetry';
import { logger } from '../telemetry';
import { ensureBucketPolicy } from '../infra';
import { createApp } from './app';

void ensureBucketPolicy().catch((error) => {
  logger.error('failed to ensure bucket policy', { error: error.message });
});

const app = createApp();
const port = Number(process.env.PORT ?? 4000);

logger.info('Starting BFF service');

app.listen(port, () => {
  logger.info('BFF listening', { port, url: `http://localhost:${port}` });
});
