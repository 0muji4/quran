package arabic

import (
	"math"
	"testing"
)

func TestNormalize(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "بسم الله الرحمن الرحيم"},
		{"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "الحمد لله رب العالمين"},
		{"", ""},
	}
	for _, c := range cases {
		if got := Normalize(c.in); got != c.want {
			t.Errorf("Normalize(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestWER(t *testing.T) {
	ref := "بسم الله الرحمن الرحيم"
	cases := []struct {
		name, ref, hyp string
		want           float64
	}{
		{"exact match", ref, ref, 0},
		{"deletion", ref, "بسم الرحمن الرحيم", 1.0 / 4},
		{"insertion", ref, "بسم الله العظيم الرحمن الرحيم", 1.0 / 4},
		{"substitution", ref, "بسم الله الرحمن الكريم", 1.0 / 4},
		{"empty ref empty hyp", "", "", 0},
		{"empty ref non-empty hyp", "", "anything", 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := WER(c.ref, c.hyp); math.Abs(got-c.want) > 1e-9 {
				t.Errorf("WER = %v, want %v", got, c.want)
			}
		})
	}
}

func TestWERIgnoresDiacritics(t *testing.T) {
	// Same text with and without tashkeel must score zero.
	ref := "بِسْمِ اللَّهِ"
	hyp := "بسم الله"
	if got := WER(ref, hyp); got != 0 {
		t.Errorf("WER ignoring diacritics = %v, want 0", got)
	}
}

func TestAlign(t *testing.T) {
	got := Align("واحد اثنين ثلاثة", "واحد اثنان ثلاثة")
	want := []Alignment{
		{RefWord: "واحد", HypWord: "واحد", Op: OpMatch},
		{RefWord: "اثنين", HypWord: "اثنان", Op: OpSubstitute},
		{RefWord: "ثلاثة", HypWord: "ثلاثة", Op: OpMatch},
	}
	assertAlignment(t, got, want)
}

func TestAlignDeletion(t *testing.T) {
	got := Align("a b c", "a c")
	want := []Alignment{
		{RefWord: "a", HypWord: "a", Op: OpMatch},
		{RefWord: "b", Op: OpDelete},
		{RefWord: "c", HypWord: "c", Op: OpMatch},
	}
	assertAlignment(t, got, want)
}

func TestAlignInsertion(t *testing.T) {
	got := Align("a c", "a b c")
	want := []Alignment{
		{RefWord: "a", HypWord: "a", Op: OpMatch},
		{HypWord: "b", Op: OpInsert},
		{RefWord: "c", HypWord: "c", Op: OpMatch},
	}
	assertAlignment(t, got, want)
}

func TestAlignEmptyReference(t *testing.T) {
	got := Align("", "a b")
	want := []Alignment{
		{HypWord: "a", Op: OpInsert},
		{HypWord: "b", Op: OpInsert},
	}
	assertAlignment(t, got, want)
}

func TestAlignEmptyHypothesis(t *testing.T) {
	got := Align("a b", "")
	want := []Alignment{
		{RefWord: "a", Op: OpDelete},
		{RefWord: "b", Op: OpDelete},
	}
	assertAlignment(t, got, want)
}

func assertAlignment(t *testing.T, got, want []Alignment) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d (got=%+v)", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("alignment[%d] = %+v, want %+v", i, got[i], want[i])
		}
	}
}

func TestScorePronunciationWithWER(t *testing.T) {
	alignments := []Alignment{
		{RefWord: "a", HypWord: "a", Op: OpMatch},
		{RefWord: "b", HypWord: "c", Op: OpSubstitute},
		{RefWord: "d", Op: OpDelete},
		{HypWord: "e", Op: OpInsert},
	}
	probs := []float64{0.9, 0.7, 0.8}
	wer := 0.5
	got := ScorePronunciation(alignments, probs, &wer)

	wantAccuracy := 0.5 // 1 - wer
	wantCompleteness := (3.0 - 1.0) / 3.0
	wantFluency := (0.9 + 0.7 + 0.8) / 3.0
	wantOverall := (wantAccuracy + wantCompleteness) / 2.0

	assertScore(t, "Accuracy", got.Accuracy, wantAccuracy)
	assertScore(t, "Completeness", got.Completeness, wantCompleteness)
	assertScore(t, "Fluency", got.Fluency, wantFluency)
	assertScore(t, "Overall", got.Overall, wantOverall)
}

func TestScorePronunciationWERNilFallsBackToCounts(t *testing.T) {
	alignments := []Alignment{
		{RefWord: "a", HypWord: "a", Op: OpMatch},
		{RefWord: "b", HypWord: "c", Op: OpSubstitute},
		{RefWord: "d", Op: OpDelete},
	}
	got := ScorePronunciation(alignments, nil, nil)

	assertScore(t, "Accuracy", got.Accuracy, 1.0/3.0)
	assertScore(t, "Completeness", got.Completeness, (3.0-1.0)/3.0)
	assertScore(t, "Fluency", got.Fluency, 0)
}

func TestScorePronunciationEmpty(t *testing.T) {
	got := ScorePronunciation(nil, nil, nil)
	if got != (PronunciationScore{}) {
		t.Errorf("empty input score = %+v, want zero value", got)
	}
}

func TestScorePronunciationClampsOutOfRangeWER(t *testing.T) {
	alignments := []Alignment{{RefWord: "a", HypWord: "a", Op: OpMatch}}
	werNeg := -0.5
	werHigh := 1.5
	if got := ScorePronunciation(alignments, nil, &werNeg); got.Accuracy != 1 {
		t.Errorf("negative wer Accuracy = %v, want 1", got.Accuracy)
	}
	if got := ScorePronunciation(alignments, nil, &werHigh); got.Accuracy != 0 {
		t.Errorf("wer > 1 Accuracy = %v, want 0", got.Accuracy)
	}
}

func assertScore(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 1e-9 {
		t.Errorf("%s = %v, want %v", name, got, want)
	}
}
