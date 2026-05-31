package arabic

// Op identifies a word-alignment operation.
type Op string

const (
	OpMatch      Op = "match"
	OpSubstitute Op = "substitute"
	OpDelete     Op = "delete"
	OpInsert     Op = "insert"
)

// Alignment is one row of the reference/hypothesis alignment. RefWord is empty
// for inserts; HypWord is empty for deletes.
type Alignment struct {
	RefWord string `json:"ref_word,omitempty"`
	HypWord string `json:"hyp_word,omitempty"`
	Op      Op     `json:"op"`
}

// Align returns the word-level edit script between reference and hypothesis
// after diacritic normalization. Ties are broken in match > substitute >
// delete > insert order to match the Python implementation.
func Align(reference, hypothesis string) []Alignment {
	ref := tokenize(Normalize(reference))
	hyp := tokenize(Normalize(hypothesis))
	refLen, hypLen := len(ref), len(hyp)

	dp := make([][]int, refLen+1)
	ops := make([][]Op, refLen+1)
	for i := range dp {
		dp[i] = make([]int, hypLen+1)
		ops[i] = make([]Op, hypLen+1)
	}
	for i := 1; i <= refLen; i++ {
		dp[i][0] = i
		ops[i][0] = OpDelete
	}
	for j := 1; j <= hypLen; j++ {
		dp[0][j] = j
		ops[0][j] = OpInsert
	}

	for i := 1; i <= refLen; i++ {
		for j := 1; j <= hypLen; j++ {
			cost := 1
			diagOp := OpSubstitute
			if ref[i-1] == hyp[j-1] {
				cost = 0
				diagOp = OpMatch
			}
			dp[i][j], ops[i][j] = pickBest(
				dp[i-1][j-1]+cost, diagOp,
				dp[i-1][j]+1, OpDelete,
				dp[i][j-1]+1, OpInsert,
			)
		}
	}

	alignments := traceback(ref, hyp, ops, refLen, hypLen)
	reverse(alignments)
	return alignments
}

// pickBest selects the cheapest candidate, breaking ties by operation priority.
func pickBest(c1 int, o1 Op, c2 int, o2 Op, c3 int, o3 Op) (int, Op) {
	bestCost, bestOp := c1, o1
	for _, cand := range [...]struct {
		cost int
		op   Op
	}{{c2, o2}, {c3, o3}} {
		if cand.cost < bestCost || (cand.cost == bestCost && opPriority(cand.op) < opPriority(bestOp)) {
			bestCost, bestOp = cand.cost, cand.op
		}
	}
	return bestCost, bestOp
}

func opPriority(op Op) int {
	switch op {
	case OpMatch:
		return 0
	case OpSubstitute:
		return 1
	case OpDelete:
		return 2
	case OpInsert:
		return 3
	}
	return 4
}

func traceback(ref, hyp []string, ops [][]Op, i, j int) []Alignment {
	out := make([]Alignment, 0, i+j)
	for i > 0 || j > 0 {
		switch ops[i][j] {
		case OpMatch, OpSubstitute:
			out = append(out, Alignment{RefWord: ref[i-1], HypWord: hyp[j-1], Op: ops[i][j]})
			i--
			j--
		case OpDelete:
			out = append(out, Alignment{RefWord: ref[i-1], Op: OpDelete})
			i--
		case OpInsert:
			out = append(out, Alignment{HypWord: hyp[j-1], Op: OpInsert})
			j--
		default:
			return out
		}
	}
	return out
}

func reverse(a []Alignment) {
	for i, j := 0, len(a)-1; i < j; i, j = i+1, j-1 {
		a[i], a[j] = a[j], a[i]
	}
}
