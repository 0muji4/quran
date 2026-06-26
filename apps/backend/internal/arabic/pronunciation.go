package arabic

// PronunciationScore is the per-recitation breakdown returned by
// ScorePronunciation. All fields are clamped to [0, 1].
type PronunciationScore struct {
	Accuracy     float64 `json:"accuracy"`
	Fluency      float64 `json:"fluency"`
	Completeness float64 `json:"completeness"`
	Overall      float64 `json:"overall"`
}

// ScorePronunciation aggregates an Align result and per-word probabilities
// into a final pronunciation score.
//
//   - accuracy = clamp(1 - *wer) when wer is non-nil, otherwise
//     matches / (matches + substitutes + deletes).
//   - completeness = (ref_count - delete_count) / ref_count.
//   - fluency = mean of probabilities (0 when none are supplied).
//   - overall = mean of accuracy and completeness; fluency is excluded
//     because chirp_3 returns no per-word confidence (always 0).
//
// probabilities should contain confidence values for recognised words only;
// callers filter out words without a confidence. Passing nil or an empty
// slice yields fluency = 0.
func ScorePronunciation(alignments []Alignment, probabilities []float64, wer *float64) PronunciationScore {
	var refCount, matchCount, subCount, delCount int
	for _, a := range alignments {
		if a.RefWord != "" {
			refCount++
		}
		switch a.Op {
		case OpMatch:
			matchCount++
		case OpSubstitute:
			subCount++
		case OpDelete:
			delCount++
		}
	}

	var accuracy float64
	if wer != nil {
		accuracy = clamp(1.0 - *wer)
	} else {
		denom := matchCount + subCount + delCount
		if denom < 1 {
			denom = 1
		}
		accuracy = clamp(float64(matchCount) / float64(denom))
	}

	completenessDenom := refCount
	if completenessDenom < 1 {
		completenessDenom = 1
	}
	completeness := clamp(float64(refCount-delCount) / float64(completenessDenom))

	var fluency float64
	if len(probabilities) > 0 {
		sum := 0.0
		for _, p := range probabilities {
			sum += p
		}
		fluency = clamp(sum / float64(len(probabilities)))
	}

	overall := clamp((accuracy + completeness) / 2.0)
	return PronunciationScore{
		Accuracy:     accuracy,
		Fluency:      fluency,
		Completeness: completeness,
		Overall:      overall,
	}
}

func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
