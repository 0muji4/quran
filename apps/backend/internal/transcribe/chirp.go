package transcribe

import (
	"context"
	"fmt"
	"io"
	"strings"

	speech "cloud.google.com/go/speech/apiv2"
	"cloud.google.com/go/speech/apiv2/speechpb"
	"google.golang.org/api/option"
)

// ChirpConfig configures the Google Cloud Speech-to-Text v2 (Chirp 2) backend.
type ChirpConfig struct {
	// Project is the Google Cloud project ID. Required.
	Project string
	// Location is the Speech v2 location, e.g. "global" or "us-central1".
	// Chirp 2 is not available in every region; default is "global".
	Location string
	// LanguageCode is the BCP-47 code passed to the recognizer.
	// Defaults to "ar-SA" — Modern Standard Arabic, closest fit for Quranic recitation.
	LanguageCode string
	// Model overrides the recognition model. Defaults to "chirp_2".
	Model string
	// PhraseBoost is the bias applied to ExpectedText tokens when adaptation
	// is enabled. Google recommends 10–20; defaults to 15.
	PhraseBoost float32
	// DisablePhraseBoost turns off the SpeechAdaptation hint. Useful if the
	// chosen model rejects adaptation requests.
	DisablePhraseBoost bool
}

func (c *ChirpConfig) applyDefaults() {
	if c.Location == "" {
		c.Location = "global"
	}
	if c.LanguageCode == "" {
		c.LanguageCode = "ar-SA"
	}
	if c.Model == "" {
		c.Model = "chirp_2"
	}
	if c.PhraseBoost == 0 {
		c.PhraseBoost = 15
	}
}

// recognizeFunc is the seam used by tests to substitute the GCP client.
type recognizeFunc func(context.Context, *speechpb.RecognizeRequest) (*speechpb.RecognizeResponse, error)

// ChirpTranscriber implements Transcriber against Google Cloud Speech v2.
type ChirpTranscriber struct {
	cfg       ChirpConfig
	recognize recognizeFunc
	close     func() error
}

// NewChirpTranscriber opens a Speech v2 client using Application Default
// Credentials and returns a transcriber bound to it. The caller must call
// Close when done.
func NewChirpTranscriber(ctx context.Context, cfg ChirpConfig) (*ChirpTranscriber, error) {
	if cfg.Project == "" {
		return nil, fmt.Errorf("transcribe: ChirpConfig.Project is required")
	}
	cfg.applyDefaults()

	// Speech v2 uses a per-region API endpoint when Location is not
	// "global". chirp_2 is not available at the global endpoint, so deploys
	// that want chirp_2 must pick a supported region (e.g. asia-southeast1)
	// AND connect to the matching <region>-speech.googleapis.com host.
	var clientOpts []option.ClientOption
	if cfg.Location != "" && cfg.Location != "global" {
		clientOpts = append(clientOpts, option.WithEndpoint(
			fmt.Sprintf("%s-speech.googleapis.com:443", cfg.Location),
		))
	}
	client, err := speech.NewClient(ctx, clientOpts...)
	if err != nil {
		return nil, fmt.Errorf("transcribe: open speech client: %w", err)
	}
	return &ChirpTranscriber{
		cfg: cfg,
		recognize: func(ctx context.Context, req *speechpb.RecognizeRequest) (*speechpb.RecognizeResponse, error) {
			return client.Recognize(ctx, req)
		},
		close: client.Close,
	}, nil
}

// Close releases the underlying client.
func (t *ChirpTranscriber) Close() error {
	if t.close == nil {
		return nil
	}
	return t.close()
}

// Transcribe sends one synchronous Recognize call. The audio is buffered into
// memory because Speech v2's non-streaming endpoint takes inline bytes.
func (t *ChirpTranscriber) Transcribe(ctx context.Context, req Request) (Result, error) {
	if req.Audio == nil {
		return Result{}, fmt.Errorf("transcribe: Request.Audio is nil")
	}
	audioBytes, err := io.ReadAll(req.Audio)
	if err != nil {
		return Result{}, fmt.Errorf("transcribe: read audio: %w", err)
	}

	rpcReq := t.buildRequest(req.ExpectedText, audioBytes)
	resp, err := t.recognize(ctx, rpcReq)
	if err != nil {
		return Result{}, fmt.Errorf("transcribe: recognize: %w", err)
	}
	return parseResponse(resp), nil
}

func (t *ChirpTranscriber) buildRequest(expectedText string, audio []byte) *speechpb.RecognizeRequest {
	// "_" is the inline recognizer alias: config travels with the request
	// instead of being persisted server-side.
	recognizer := fmt.Sprintf("projects/%s/locations/%s/recognizers/_", t.cfg.Project, t.cfg.Location)

	config := &speechpb.RecognitionConfig{
		DecodingConfig: &speechpb.RecognitionConfig_AutoDecodingConfig{
			AutoDecodingConfig: &speechpb.AutoDetectDecodingConfig{},
		},
		Model:         t.cfg.Model,
		LanguageCodes: []string{t.cfg.LanguageCode},
		Features:      featuresForModel(t.cfg.Model),
	}
	if !t.cfg.DisablePhraseBoost {
		if adaptation := buildAdaptation(expectedText, t.cfg.PhraseBoost); adaptation != nil {
			config.Adaptation = adaptation
		}
	}

	return &speechpb.RecognizeRequest{
		Recognizer:  recognizer,
		Config:      config,
		AudioSource: &speechpb.RecognizeRequest_Content{Content: audio},
	}
}

// featuresForModel returns the RecognitionFeatures the configured model can
// actually honour. chirp_3 (and its variants) reject per-word confidence and
// time-offset requests; chirp_2 / chirp / latest_* accept both. Callers that
// rely on per-word metadata must pick a model that exposes it.
func featuresForModel(model string) *speechpb.RecognitionFeatures {
	if strings.HasPrefix(model, "chirp_3") {
		return &speechpb.RecognitionFeatures{}
	}
	return &speechpb.RecognitionFeatures{
		EnableWordTimeOffsets: true,
		EnableWordConfidence:  true,
	}
}

// buildAdaptation turns the expected ayah text into a single inline phrase
// set with each unique word boosted. Returns nil when there is nothing to boost.
func buildAdaptation(expectedText string, boost float32) *speechpb.SpeechAdaptation {
	words := uniqueWords(expectedText)
	if len(words) == 0 {
		return nil
	}
	phrases := make([]*speechpb.PhraseSet_Phrase, 0, len(words))
	for _, w := range words {
		phrases = append(phrases, &speechpb.PhraseSet_Phrase{Value: w, Boost: boost})
	}
	return &speechpb.SpeechAdaptation{
		PhraseSets: []*speechpb.SpeechAdaptation_AdaptationPhraseSet{
			{
				Value: &speechpb.SpeechAdaptation_AdaptationPhraseSet_InlinePhraseSet{
					InlinePhraseSet: &speechpb.PhraseSet{Phrases: phrases},
				},
			},
		},
	}
}

func uniqueWords(text string) []string {
	seen := make(map[string]struct{})
	out := make([]string, 0)
	for _, w := range strings.Fields(text) {
		if _, ok := seen[w]; ok {
			continue
		}
		seen[w] = struct{}{}
		out = append(out, w)
	}
	return out
}

// parseResponse collapses Speech v2 results into a single transcript by
// joining the top alternative of each result. Word-level metadata is
// flattened in the same order.
func parseResponse(resp *speechpb.RecognizeResponse) Result {
	var transcripts []string
	var words []Word
	for _, result := range resp.GetResults() {
		alts := result.GetAlternatives()
		if len(alts) == 0 {
			continue
		}
		top := alts[0]
		if t := strings.TrimSpace(top.GetTranscript()); t != "" {
			transcripts = append(transcripts, t)
		}
		for _, w := range top.GetWords() {
			words = append(words, Word{
				Text:       w.GetWord(),
				Start:      w.GetStartOffset().AsDuration(),
				End:        w.GetEndOffset().AsDuration(),
				Confidence: float64(w.GetConfidence()),
			})
		}
	}
	return Result{
		Transcript: strings.Join(transcripts, " "),
		Words:      words,
	}
}

// Compile-time assertion that ChirpTranscriber implements Transcriber.
var _ Transcriber = (*ChirpTranscriber)(nil)
