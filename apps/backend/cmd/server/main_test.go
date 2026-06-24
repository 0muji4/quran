package main

import (
	"context"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/require"

	"quran-project/apps/backend/internal/transcribe"
)

func TestEnvOr(t *testing.T) {
	require.Equal(t, "fallback", envOr("ENVOR_UNSET", "fallback"))

	t.Setenv("ENVOR_SET", "value")
	require.Equal(t, "value", envOr("ENVOR_SET", "fallback"))

	t.Setenv("ENVOR_EMPTY", "")
	require.Equal(t, "fallback", envOr("ENVOR_EMPTY", "fallback"))
}

func TestEnvBool(t *testing.T) {
	require.False(t, envBool("ENVBOOL_UNSET", false))
	require.True(t, envBool("ENVBOOL_UNSET", true))

	t.Setenv("ENVBOOL", "true")
	require.True(t, envBool("ENVBOOL", false))

	t.Setenv("ENVBOOL", "false")
	require.False(t, envBool("ENVBOOL", true))

	t.Setenv("ENVBOOL", "1")
	require.True(t, envBool("ENVBOOL", false))

	t.Setenv("ENVBOOL", "notabool")
	require.True(t, envBool("ENVBOOL", true))
	require.False(t, envBool("ENVBOOL", false))
}

// Without CHIRP_PROJECT the backend still boots — scoring errors at request
// time, not startup.
func TestNewTranscriberUnavailableWhenChirpUnset(t *testing.T) {
	t.Setenv("CHIRP_PROJECT", "")

	tr, err := newTranscriber(context.Background(), slog.Default())
	require.NoError(t, err)
	require.NotNil(t, tr)

	_, scoreErr := tr.Transcribe(context.Background(), transcribe.Request{})
	require.ErrorIs(t, scoreErr, transcribe.ErrUnavailable)
}
