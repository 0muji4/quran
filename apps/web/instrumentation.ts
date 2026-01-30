export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to prevent client bundle inclusion
    const { initTelemetry } = await import('./app/telemetry/telemetry');
    await initTelemetry();
    console.log('OpenTelemetry initialized for quran-web');
  }
}
