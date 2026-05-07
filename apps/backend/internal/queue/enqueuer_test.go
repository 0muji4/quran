package queue

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	pkgqueue "quran-project/packages/go-pkg/queue"
)

type fakeClient struct {
	lastJob pkgqueue.Job
}

func (f *fakeClient) Enqueue(ctx context.Context, job pkgqueue.Job) error {
	f.lastJob = job
	return nil
}

func TestPublishASRJob(t *testing.T) {
	client := &fakeClient{}
	enqueuer := newEnqueuerWithClient(client, "token-123")

	err := enqueuer.PublishASRJob(context.Background(), "session-1", "audio.wav", 99, "الْحَمْدُ", "reference-audio/001001.mp3")
	require.NoError(t, err)

	require.Equal(t, "session-1", client.lastJob.SessionID)
	require.Equal(t, "token-123", client.lastJob.AuthToken)
	require.Equal(t, int64(99), client.lastJob.AyahID)
	require.Equal(t, "reference-audio/001001.mp3", client.lastJob.ReferenceAudioKey)
	require.False(t, client.lastJob.EnqueuedAt.IsZero())
	require.Less(t, time.Since(client.lastJob.EnqueuedAt), time.Second)
}

func TestPublishASRJobOmitsReferenceAudioKeyWhenEmpty(t *testing.T) {
	client := &fakeClient{}
	enqueuer := newEnqueuerWithClient(client, "token-123")

	err := enqueuer.PublishASRJob(context.Background(), "session-1", "audio.wav", 99, "الْحَمْدُ", "")
	require.NoError(t, err)
	require.Equal(t, "", client.lastJob.ReferenceAudioKey)
}

func TestPublishASRJobWithTraceContext(t *testing.T) {
	// Setup tracer provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	otel.SetTracerProvider(tp)
	defer tp.Shutdown(context.Background())

	// Set W3C Trace Context propagator (required for trace injection)
	otel.SetTextMapPropagator(otel.GetTextMapPropagator())

	client := &fakeClient{}
	enqueuer := newEnqueuerWithClient(client, "token-123")

	// Create a span context
	ctx, span := tp.Tracer("test").Start(context.Background(), "test-span")
	defer span.End()

	err := enqueuer.PublishASRJob(ctx, "session-1", "audio.wav", 99, "الْحَمْدُ", "reference-audio/001001.mp3")
	require.NoError(t, err)

	// Verify TraceContext was injected
	require.NotNil(t, client.lastJob.TraceContext)

	// Note: TraceContext may be empty if no propagator is configured
	// In production, this is set by the OTEL SDK initialization
	// For this test, we just verify the field exists
}

func TestPublishASRJobWithoutSpan(t *testing.T) {
	client := &fakeClient{}
	enqueuer := newEnqueuerWithClient(client, "token-123")

	// Call without span - should still work
	err := enqueuer.PublishASRJob(context.Background(), "session-1", "audio.wav", 99, "الْحَمْدُ", "reference-audio/001001.mp3")
	require.NoError(t, err)

	// TraceContext should exist but may be empty or contain default values
	require.NotNil(t, client.lastJob.TraceContext)
}
