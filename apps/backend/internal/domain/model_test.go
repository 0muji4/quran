package domain

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSurahJSONOmitsEmptyMetadata(t *testing.T) {
	surah := Surah{
		ID:              1,
		NameAR:          "الفاتحة",
		NameEN:          "Al-Fatiha",
		RevelationPlace: "Mecca",
		AyahCount:       7,
	}

	payload, err := json.Marshal(surah)
	require.NoError(t, err)
	require.False(t, strings.Contains(string(payload), "metadata"), "expected metadata to be omitted, got %s", string(payload))
}
