import '../telemetry';
import { ensureBucketPolicy } from '../infra';
import { createApp } from './app';

void ensureBucketPolicy().catch((error) => {
  console.error('failed to ensure bucket policy', error);
});

const app = createApp();
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`BFF listening on http://localhost:${port}`);
});
