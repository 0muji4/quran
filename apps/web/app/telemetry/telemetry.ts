import { trace, metrics } from '@opentelemetry/api';

// `@opentelemetry/api` のみを参照する軽量モジュール。
// NodeSDK 等の重い初期化コードは `./sdk.ts` 側に分離してあり、
// `instrumentation.ts` からのみ動的 import される。これにより、`tracer`/`meter`
// を import する actions/helpers が SDK ツリー全体をバンドルしなくて済む。
const serviceName = process.env.OTEL_SERVICE_NAME || 'quran-web';

export const tracer = trace.getTracer(serviceName);
export const meter = metrics.getMeter(serviceName);
