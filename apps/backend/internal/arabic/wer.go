package arabic

// WER returns the Word Error Rate between reference and hypothesis after
// diacritic normalization. The denominator is the reference token count; an
// empty reference returns 0 (or 1 if the hypothesis is non-empty).
func WER(reference, hypothesis string) float64 {
	ref := tokenize(Normalize(reference))
	hyp := tokenize(Normalize(hypothesis))

	if len(ref) == 0 {
		if len(hyp) == 0 {
			return 0
		}
		return 1
	}

	dp := levenshteinMatrix(ref, hyp)
	return float64(dp[len(ref)][len(hyp)]) / float64(len(ref))
}

// levenshteinMatrix computes the standard edit-distance DP table on token slices.
func levenshteinMatrix(ref, hyp []string) [][]int {
	rows, cols := len(ref)+1, len(hyp)+1
	dp := make([][]int, rows)
	for i := range dp {
		dp[i] = make([]int, cols)
		dp[i][0] = i
	}
	for j := 0; j < cols; j++ {
		dp[0][j] = j
	}
	for i := 1; i < rows; i++ {
		for j := 1; j < cols; j++ {
			cost := 1
			if ref[i-1] == hyp[j-1] {
				cost = 0
			}
			dp[i][j] = min3(
				dp[i-1][j]+1,      // deletion
				dp[i][j-1]+1,      // insertion
				dp[i-1][j-1]+cost, // substitution / match
			)
		}
	}
	return dp
}

func min3(a, b, c int) int {
	m := a
	if b < m {
		m = b
	}
	if c < m {
		m = c
	}
	return m
}
