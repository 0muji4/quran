package domain

import "time"

// Surah captures high-level metadata about a chapter of the Quran.
type Surah struct {
	ID              int32          `json:"id"`
	NameAR          string         `json:"name_ar"`
	NameEN          string         `json:"name_en"`
	RevelationPlace string         `json:"revelation_place"`
	AyahCount       int32          `json:"ayah_count"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// Ayah represents a verse with multilingual content.
type Ayah struct {
	ID              int64          `json:"id"`
	SurahID         int32          `json:"surah_id"`
	AyahNumber      int32          `json:"ayah_number"`
	TextAR          string         `json:"text_ar"`
	TextEN          string         `json:"text_en,omitempty"`
	Transliteration string         `json:"transliteration,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// Attempt records a learner submission for evaluation.
type Attempt struct {
	ID         string         `json:"id"`
	UserID     string         `json:"user_id"`
	SurahID    int32          `json:"surah_id"`
	AyahID     int64          `json:"ayah_id"`
	Transcript string         `json:"transcript"`
	Evaluation map[string]any `json:"evaluation,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

// SegmentScore stores per-segment scoring results for an attempt.
type SegmentScore struct {
	ID        int64          `json:"id"`
	AttemptID string         `json:"attempt_id"`
	Label     string         `json:"label"`
	Score     float64        `json:"score"`
	Metrics   map[string]any `json:"metrics,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}

// Alignment tracks hypothesis/reference pairs for pronunciation feedback.
type Alignment struct {
	ID         int64          `json:"id"`
	AttemptID  string         `json:"attempt_id"`
	Hypothesis map[string]any `json:"hypothesis"`
	Reference  map[string]any `json:"reference"`
	Distance   float64        `json:"distance"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

// ASRResult stores inference output from the worker keyed by session ID.
type ASRResult struct {
	SessionID         string         `json:"session_id"`
	AyahID            int64          `json:"ayah_id"`
	AudioKey          string         `json:"audio_key"`
	ExpectedTextAR    string         `json:"expected_text_ar,omitempty"`
	Transcript        string         `json:"transcript"`
	WordTimestamps    map[string]any `json:"word_timestamps"`
	WER               float64        `json:"wer,omitempty"`
	AlignmentObjectID string         `json:"alignment_object_key,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}
