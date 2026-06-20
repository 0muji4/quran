//go:build integration

package repo_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/repo"
	"quran-project/apps/backend/internal/testutil"
)

func TestPostgresRepository_GetByNumber(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)

	t.Run("returns the matching ayah", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		ayah, err := repository.GetByNumber(context.Background(), 1, 2)

		require.NoError(t, err)
		require.Equal(t, int32(1), ayah.SurahID)
		require.Equal(t, int32(2), ayah.AyahNumber)
		require.NotEmpty(t, ayah.TextAr)
	})

	t.Run("returns ErrAyahNotFound when missing", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		_, err := repository.GetByNumber(context.Background(), 1, 999)

		require.ErrorIs(t, err, repo.ErrAyahNotFound)
	})
}

func TestPostgresRepository_ScoringJobLifecycle(t *testing.T) {
	testutil.SkipIfShort(t)

	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repository := repo.NewPostgresRepository(db)
	ctx := context.Background()

	params := repo.StartScoringJobParams{
		SessionID:  "sess-1",
		UserID:     "user-1",
		UploadKey:  "uploads/sess-1.opus",
		SurahID:    1,
		AyahID:     1,
		AyahNumber: 1,
	}

	t.Run("Start opens a RUNNING job", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		createdAt, err := repository.Start(ctx, params)
		require.NoError(t, err)
		require.False(t, createdAt.IsZero())

		job, err := repository.Get(ctx, "sess-1")
		require.NoError(t, err)
		require.Equal(t, "RUNNING", job.Status)
		require.Equal(t, "uploads/sess-1.opus", job.UploadKey)
		require.Nil(t, job.Score)
		require.Empty(t, job.Evaluation)
		// segments column defaults to '[]'::jsonb.
		require.JSONEq(t, "[]", string(job.Segments))
	})

	t.Run("Start is idempotent (upsert) and preserves created_at", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		first, err := repository.Start(ctx, params)
		require.NoError(t, err)

		second, err := repository.Start(ctx, params)
		require.NoError(t, err)
		require.Equal(t, first.UTC(), second.UTC())
	})

	t.Run("Complete records score and evaluation", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		_, err := repository.Start(ctx, params)
		require.NoError(t, err)

		eval := json.RawMessage(`{"accuracy":1,"fluency":0.9,"completeness":1}`)
		require.NoError(t, repository.Complete(ctx, "sess-1", 0.85, eval))

		job, err := repository.Get(ctx, "sess-1")
		require.NoError(t, err)
		require.Equal(t, "COMPLETED", job.Status)
		require.NotNil(t, job.Score)
		require.InDelta(t, 0.85, *job.Score, 1e-9)
		require.JSONEq(t, string(eval), string(job.Evaluation))
	})

	t.Run("MarkFailed flips status to FAILED", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		_, err := repository.Start(ctx, params)
		require.NoError(t, err)

		require.NoError(t, repository.MarkFailed(ctx, "sess-1"))

		job, err := repository.Get(ctx, "sess-1")
		require.NoError(t, err)
		require.Equal(t, "FAILED", job.Status)
	})

	t.Run("Get returns ErrScoringJobNotFound for unknown session", func(t *testing.T) {
		testutil.CleanupTables(t, db)
		testutil.SeedStandardData(t, db)

		_, err := repository.Get(ctx, "does-not-exist")
		require.ErrorIs(t, err, repo.ErrScoringJobNotFound)
	})
}
