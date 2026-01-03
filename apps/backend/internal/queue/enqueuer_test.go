package queue

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

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

	err := enqueuer.PublishASRJob(context.Background(), "session-1", "audio.wav", 99, "الْحَمْدُ")
	require.NoError(t, err)

	require.Equal(t, "session-1", client.lastJob.SessionID)
	require.Equal(t, "token-123", client.lastJob.AuthToken)
	require.Equal(t, int64(99), client.lastJob.AyahID)
	require.False(t, client.lastJob.EnqueuedAt.IsZero())
	require.Less(t, time.Since(client.lastJob.EnqueuedAt), time.Second)
}
