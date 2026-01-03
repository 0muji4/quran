package telemetry

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetenvFallback(t *testing.T) {
	key := "OTEL_SERVICE_NAME"
	original := os.Getenv(key)
	t.Cleanup(func() {
		_ = os.Setenv(key, original)
	})

	_ = os.Unsetenv(key)
	require.Equal(t, "fallback", getenv(key, "fallback"))

	require.NoError(t, os.Setenv(key, "custom"))
	require.Equal(t, "custom", getenv(key, "fallback"))
}
