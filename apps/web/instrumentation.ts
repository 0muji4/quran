export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // dev で OTEL_EXPORTER_OTLP_ENDPOINT を設定しない限り SDK を読み込まない。
    // NODE_ENV はコンパイル時に定数畳み込みされるため、dev ビルドからは
    // `@opentelemetry/sdk-node` の依存ツリー全体が落ちる（webpack/Turbopack ともに）。
    if (process.env.NODE_ENV !== 'production' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      return;
    }
    const { initTelemetry } = await import('./app/telemetry/sdk');
    await initTelemetry();
    console.log('OpenTelemetry initialized for quran-web');
  }
}
