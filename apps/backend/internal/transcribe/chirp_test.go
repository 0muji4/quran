package transcribe

import (
	"bytes"
	"context"
	"errors"
	"math"
	"strings"
	"testing"
	"time"

	"cloud.google.com/go/speech/apiv2/speechpb"
	"google.golang.org/protobuf/types/known/durationpb"
)

func newTestTranscriber(t *testing.T, fn recognizeFunc) *ChirpTranscriber {
	t.Helper()
	cfg := ChirpConfig{Project: "p"}
	cfg.applyDefaults()
	return &ChirpTranscriber{cfg: cfg, recognize: fn}
}

func TestApplyDefaults(t *testing.T) {
	cfg := ChirpConfig{Project: "p"}
	cfg.applyDefaults()
	if cfg.Location != "global" || cfg.LanguageCode != "ar-SA" || cfg.Model != "chirp_2" || cfg.PhraseBoost != 15 {
		t.Errorf("unexpected defaults: %+v", cfg)
	}
}

func TestBuildRequest(t *testing.T) {
	tr := newTestTranscriber(t, nil)
	req := tr.buildRequest("بسم الله", []byte("audio"))

	if want := "projects/p/locations/global/recognizers/_"; req.GetRecognizer() != want {
		t.Errorf("recognizer = %q, want %q", req.GetRecognizer(), want)
	}
	if model := req.GetConfig().GetModel(); model != "chirp_2" {
		t.Errorf("model = %q, want chirp_2", model)
	}
	if langs := req.GetConfig().GetLanguageCodes(); len(langs) != 1 || langs[0] != "ar-SA" {
		t.Errorf("language codes = %v, want [ar-SA]", langs)
	}
	feat := req.GetConfig().GetFeatures()
	if !feat.GetEnableWordTimeOffsets() || !feat.GetEnableWordConfidence() {
		t.Errorf("word-level features not enabled: %+v", feat)
	}
	if content := req.GetContent(); !bytes.Equal(content, []byte("audio")) {
		t.Errorf("audio content not propagated: %v", content)
	}
}

func TestBuildRequestPhraseBoost(t *testing.T) {
	tr := newTestTranscriber(t, nil)
	req := tr.buildRequest("بسم الله بسم", []byte("a")) // duplicate word
	phrases := req.GetConfig().GetAdaptation().GetPhraseSets()[0].GetInlinePhraseSet().GetPhrases()
	if len(phrases) != 2 {
		t.Fatalf("expected 2 unique phrases, got %d: %v", len(phrases), phrases)
	}
	for _, p := range phrases {
		if p.GetBoost() != 15 {
			t.Errorf("phrase %q boost = %v, want 15", p.GetValue(), p.GetBoost())
		}
	}
}

func TestBuildRequestDisablePhraseBoost(t *testing.T) {
	cfg := ChirpConfig{Project: "p", DisablePhraseBoost: true}
	cfg.applyDefaults()
	tr := &ChirpTranscriber{cfg: cfg}

	req := tr.buildRequest("بسم الله", []byte("a"))
	if a := req.GetConfig().GetAdaptation(); a != nil {
		t.Errorf("adaptation should be nil when boost disabled, got %+v", a)
	}
}

func TestBuildRequestEmptyExpectedText(t *testing.T) {
	tr := newTestTranscriber(t, nil)
	req := tr.buildRequest("", []byte("a"))
	if a := req.GetConfig().GetAdaptation(); a != nil {
		t.Errorf("adaptation should be nil for empty expected text, got %+v", a)
	}
}

func TestParseResponse(t *testing.T) {
	resp := &speechpb.RecognizeResponse{
		Results: []*speechpb.SpeechRecognitionResult{
			{
				Alternatives: []*speechpb.SpeechRecognitionAlternative{
					{
						Transcript: "بسم الله",
						Words: []*speechpb.WordInfo{
							{Word: "بسم", StartOffset: durationpb.New(0), EndOffset: durationpb.New(300 * time.Millisecond), Confidence: 0.95},
							{Word: "الله", StartOffset: durationpb.New(300 * time.Millisecond), EndOffset: durationpb.New(700 * time.Millisecond), Confidence: 0.92},
						},
					},
				},
			},
			{
				Alternatives: []*speechpb.SpeechRecognitionAlternative{
					{
						Transcript: "الرحمن",
						Words: []*speechpb.WordInfo{
							{Word: "الرحمن", StartOffset: durationpb.New(700 * time.Millisecond), EndOffset: durationpb.New(1100 * time.Millisecond), Confidence: 0.88},
						},
					},
				},
			},
		},
	}

	got := parseResponse(resp)
	if got.Transcript != "بسم الله الرحمن" {
		t.Errorf("transcript = %q", got.Transcript)
	}
	if len(got.Words) != 3 {
		t.Fatalf("words len = %d, want 3", len(got.Words))
	}
	if got.Words[0].Text != "بسم" || math.Abs(got.Words[0].Confidence-0.95) > 1e-6 {
		t.Errorf("first word = %+v", got.Words[0])
	}
	if got.Words[2].End != 1100*time.Millisecond {
		t.Errorf("third word End = %v", got.Words[2].End)
	}
}

func TestParseResponseEmpty(t *testing.T) {
	got := parseResponse(&speechpb.RecognizeResponse{})
	if got.Transcript != "" || len(got.Words) != 0 {
		t.Errorf("empty response should produce empty result, got %+v", got)
	}
}

func TestTranscribePropagatesError(t *testing.T) {
	sentinel := errors.New("boom")
	tr := newTestTranscriber(t, func(context.Context, *speechpb.RecognizeRequest) (*speechpb.RecognizeResponse, error) {
		return nil, sentinel
	})
	_, err := tr.Transcribe(context.Background(), Request{Audio: strings.NewReader("a")})
	if !errors.Is(err, sentinel) {
		t.Errorf("err = %v, want wrap of sentinel", err)
	}
}

func TestTranscribeNilAudio(t *testing.T) {
	tr := newTestTranscriber(t, nil)
	if _, err := tr.Transcribe(context.Background(), Request{}); err == nil {
		t.Error("expected error for nil audio")
	}
}

func TestTranscribeRoundTrip(t *testing.T) {
	var captured *speechpb.RecognizeRequest
	tr := newTestTranscriber(t, func(_ context.Context, req *speechpb.RecognizeRequest) (*speechpb.RecognizeResponse, error) {
		captured = req
		return &speechpb.RecognizeResponse{
			Results: []*speechpb.SpeechRecognitionResult{
				{Alternatives: []*speechpb.SpeechRecognitionAlternative{{Transcript: "hello"}}},
			},
		}, nil
	})
	result, err := tr.Transcribe(context.Background(), Request{
		Audio:        strings.NewReader("audio-bytes"),
		ExpectedText: "hello",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Transcript != "hello" {
		t.Errorf("transcript = %q", result.Transcript)
	}
	if !bytes.Equal(captured.GetContent(), []byte("audio-bytes")) {
		t.Errorf("audio bytes not forwarded")
	}
}
