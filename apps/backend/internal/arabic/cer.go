package arabic

import "strings"

// CER returns the Character Error Rate between reference and hypothesis
func CER(reference, hypothesis string) float64 {
	ref := []rune(strings.Join(strings.Fields(Normalize(reference)), ""))
	hyp := []rune(strings.Join(strings.Fields(Normalize(hypothesis)), ""))
	if len(ref) == 0 {
		if len(hyp) == 0 {
			return 0
		}
		return 1
	}
	prev := make([]int, len(hyp)+1)
	curr := make([]int, len(hyp)+1)
	for j := range prev {
		prev[j] = j
	}
	for i := 1; i <= len(ref); i++ {
		curr[0] = i
		for j := 1; j <= len(hyp); j++ {
			cost := 1
			if ref[i-1] == hyp[j-1] {
				cost = 0
			}
			curr[j] = min3(prev[j]+1, curr[j-1]+1, prev[j-1]+cost)
		}
		prev, curr = curr, prev
	}
	return float64(prev[len(hyp)]) / float64(len(ref))
}
