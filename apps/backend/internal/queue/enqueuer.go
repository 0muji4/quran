package queue

import (
	"context"
	"fmt"

	"quran-project/packages/go-pkg/queue"
)

// Enqueuer publishes ASR jobs to Redis so that the worker can consume them.
type Enqueuer struct {
	client *queue.Client
}

// NewEnqueuer constructs an Enqueuer with the provided queue configuration.
func NewEnqueuer(cfg queue.Config) (*Enqueuer, error) {
	client, err := queue.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("enqueue: build client: %w", err)
	}
	return &Enqueuer{client: client}, nil
}

// PublishASRJob pushes a single job for the given session/audio/ayah combination.
func (e *Enqueuer) PublishASRJob(ctx context.Context, sessionID, audioKey string, ayahID int64, expectedTextAR string) error {
	job := queue.Job{
		SessionID:      sessionID,
		AudioKey:       audioKey,
		AyahID:         ayahID,
		ExpectedTextAR: expectedTextAR,
	}
	return e.client.Enqueue(ctx, job)
}
